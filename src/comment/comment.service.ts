import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Comment } from "./comment.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Post as PostEntity } from "src/post/post.entity";

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private repo: Repository<Comment>,
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,
  ) {}

  async create(data: Partial<Comment>): Promise<Comment> {
    const commentData: Partial<Comment> = {
      user_id: data.user_id,
      post_id: data.post_id,
      content: data.content,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const savedComment = await this.repo.save(commentData);
    await this.postRepo.increment({ id: data.post_id }, "comment_count", 1);
    return savedComment;
  }

  async update(
    id: number,
    data: Partial<Comment>,
    userId: number,
  ): Promise<Comment> {
    const commentData = await this.repo.findOneBy({ id: id });
    if (!commentData) throw new NotFoundException("Comment not found");
    else if (commentData.user_id !== userId)
      throw new UnauthorizedException("Unauthorized to update this comment");
    await this.repo.update(
      { id: id },
      {
        content: data.content,
        updated_at: new Date(),
      },
    );
    return this.repo.findOneBy({ id: id }) as Promise<Comment>;
  }

  async findByPostId(post_id: number): Promise<Comment[]> {
    try {
      const comments = await this.repo.find({
        where: { post_id },
        relations: ["user"],
        order: {
          id: "DESC",
        },
      });
      if (!comments) throw new NotFoundException("Comments not found");
      return comments;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error fetching comments");
    }
  }

  async findByPosterId(user_id: number): Promise<Comment[]> {
    try {
      const comments = await this.repo.findBy({ user_id });
      if (!comments) throw new NotFoundException("Comments not found");
      return comments;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error fetching comments");
    }
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
    try {
      const comment = await this.repo.findOneBy({ id });
      const post = await this.postRepo.findOneBy({ id: comment?.post_id });
      if (!comment) throw new NotFoundException("Comment not found");
      else if (comment.user_id !== userId)
        throw new UnauthorizedException("Unauthorized to update this comment");
      await this.repo.delete({ id });
      if (post) {
        await this.postRepo.decrement(
          { id: comment.post_id },
          "comment_count",
          1,
        );
      }
      return { message: "Comment deleted successfully" };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error deleting comment");
    }
  }
}
