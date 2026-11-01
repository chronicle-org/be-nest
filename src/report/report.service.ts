import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Report } from "./report.entity";
import { CreateReportDto } from "./dto/report.dto";
import { Post } from "src/post/post.entity";
import { Comment } from "src/comment/comment.entity";
import { Page, PaginationQueryDto, toTakeSkip } from "src/utils/pagination";

/** Admins are the user ids listed in ADMIN_USER_IDS (comma-separated). */
export const isAdmin = (user_id: number): boolean =>
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .includes(user_id);

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private repo: Repository<Report>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
  ) {}

  /** Files a report. Reporting the same thing twice while it's open is a no-op. */
  async create(reporter_id: number, data: CreateReportDto): Promise<Report> {
    const { post_id, comment_id } = data;
    if (!post_id === !comment_id)
      throw new BadRequestException("Report either a post or a comment");

    const exists = post_id
      ? await this.postRepo.existsBy({ id: post_id, is_draft: false })
      : await this.commentRepo.existsBy({ id: comment_id });
    if (!exists)
      throw new NotFoundException(
        post_id ? "Post not found" : "Comment not found",
      );

    const target = post_id ? { post_id } : { comment_id };
    const open = await this.repo.findOneBy({
      reporter_id,
      status: "open",
      ...target,
    });
    if (open) return open;

    return this.repo.save(
      this.repo.create({
        reporter_id,
        ...target,
        reason: data.reason,
        details: data.details?.trim() ?? "",
      }),
    );
  }

  private assertAdmin(user_id: number) {
    if (!isAdmin(user_id))
      throw new ForbiddenException("Only admins can review reports");
  }

  /** Reports with the reported post or comment and its author, oldest open first. */
  async findAll(
    user_id: number,
    status: Report["status"],
    paging: PaginationQueryDto,
  ): Promise<Page<Report>> {
    this.assertAdmin(user_id);
    const [data, total] = await this.repo.findAndCount({
      where: { status },
      relations: ["reporter", "post", "post.user", "comment", "comment.user"],
      order: { created_at: status === "open" ? "ASC" : "DESC" },
      ...toTakeSkip(paging),
    });
    return { data, total };
  }

  /**
   * Closes a report. "removed" deletes the reported post or comment (and with
   * it, every report on it); "dismissed" keeps it.
   */
  async resolve(
    user_id: number,
    id: number,
    status: "removed" | "dismissed",
  ): Promise<{ message: string }> {
    this.assertAdmin(user_id);
    const report = await this.repo.findOneBy({ id });
    if (!report) throw new NotFoundException("Report not found");

    if (status === "dismissed") {
      await this.repo.update(
        { id },
        { status: "dismissed", resolved_at: new Date() },
      );
      return { message: "Report dismissed" };
    }

    if (report.post_id) {
      await this.postRepo.delete({ id: report.post_id });
    } else if (report.comment_id) {
      const comment = await this.commentRepo.findOneBy({
        id: report.comment_id,
      });
      if (comment) {
        const replies = await this.commentRepo.countBy({
          parent_id: comment.id,
        });
        await this.commentRepo.delete({ id: comment.id });
        await this.postRepo.decrement(
          { id: comment.post_id },
          "comment_count",
          1 + replies,
        );
      }
    }
    return { message: "Removed" };
  }
}
