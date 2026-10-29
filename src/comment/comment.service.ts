import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Comment } from "./comment.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { Post as PostEntity } from "src/post/post.entity";
import { NotificationService } from "src/notifications/notification.service";
import { NotificationSettingsService } from "src/notifications/notification-settings.service";
import { NotificationGateway } from "src/notifications/notification.gateway";
import { NotificationType } from "src/notifications/notification.entity";
import { Page, PaginationQueryDto, toTakeSkip } from "src/utils/pagination";

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private repo: Repository<Comment>,
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,
    private notificationService: NotificationService,
    private notificationSettingsService: NotificationSettingsService,
    private notificationGateway: NotificationGateway,
  ) {}

  /**
   * Execute async task in background without blocking response
   */
  private runAsync(task: () => Promise<void>, errorContext: string): void {
    void task().catch((err) => {
      console.error(`${errorContext}:`, err);
    });
  }

  /**
   * Send notification for new comment
   */
  private async sendCommentNotification(
    recipient_id: number,
    actor_id: number,
    post_id: number,
  ): Promise<void> {
    const existingNotification =
      await this.notificationService.findRecentNotificationsForUser(
        recipient_id,
        actor_id,
        NotificationType.COMMENT,
        3,
      );

    if (!existingNotification) {
      const settings =
        await this.notificationSettingsService.getUserSettings(recipient_id);

      if (settings?.notify_comments !== false) {
        const notification = await this.notificationService.createNotification({
          recipient_id,
          actor_id,
          type: NotificationType.COMMENT,
          post_id,
        });

        this.notificationGateway.sendNotificationToUser(
          recipient_id,
          notification,
        );
      }
    }
  }

  /**
   * Tells a comment's author someone replied to it. Uses the replies setting,
   * and groups repeat replies from the same person like comments do.
   */
  private async sendReplyNotification(
    recipient_id: number,
    actor_id: number,
    post_id: number,
    comment_id: number,
  ): Promise<void> {
    const existingNotification =
      await this.notificationService.findRecentNotificationsForUser(
        recipient_id,
        actor_id,
        NotificationType.REPLY,
        3,
      );
    if (existingNotification) return;

    const settings =
      await this.notificationSettingsService.getUserSettings(recipient_id);
    if (settings?.notify_replies === false) return;

    const notification = await this.notificationService.createNotification({
      recipient_id,
      actor_id,
      type: NotificationType.REPLY,
      post_id,
      comment_id,
    });
    this.notificationGateway.sendNotificationToUser(recipient_id, notification);
  }

  /** The top-level comment a new reply hangs under, checked to be on the same post. */
  private async findReplyParent(
    parent_id: number,
    post_id: number,
  ): Promise<Comment> {
    const parent = await this.repo.findOneBy({ id: parent_id });
    if (!parent || parent.post_id !== post_id)
      throw new BadRequestException("The comment you replied to was not found");
    if (parent.parent_id === null) return parent;
    const root = await this.repo.findOneBy({ id: parent.parent_id });
    if (!root)
      throw new BadRequestException("The comment you replied to was not found");
    return root;
  }

  async create(data: Partial<Comment>): Promise<Comment> {
    // Replying to a reply still notifies the person you replied to, but the
    // reply is stored under the top-level comment to keep threads one deep.
    const repliedTo = data.parent_id
      ? await this.repo.findOneBy({ id: data.parent_id })
      : null;
    const parent = data.parent_id
      ? await this.findReplyParent(data.parent_id, data.post_id as number)
      : null;

    const commentData: Partial<Comment> = {
      user_id: data.user_id,
      post_id: data.post_id,
      parent_id: parent?.id ?? null,
      content: data.content,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const savedComment = await this.repo.save(commentData, {
      reload: true,
    });
    await this.postRepo.increment({ id: data.post_id }, "comment_count", 1);

    if (repliedTo && repliedTo.user_id !== data.user_id && data.user_id) {
      this.runAsync(
        () =>
          this.sendReplyNotification(
            repliedTo.user_id,
            data.user_id as number,
            data.post_id as number,
            savedComment.id,
          ),
        `Failed to send reply notification for user ${repliedTo.user_id}`,
      );
    }

    this.runAsync(async () => {
      const post = await this.postRepo.findOneBy({ id: data.post_id });
      // The writer already hears about a reply to their own comment.
      if (
        post &&
        post.user_id !== data.user_id &&
        post.user_id !== repliedTo?.user_id &&
        data.user_id
      ) {
        this.runAsync(
          () =>
            this.sendCommentNotification(
              post.user_id,
              data.user_id as number,
              data.post_id as number,
            ),
          `Failed to send comment notification for user ${post.user_id}`,
        );
      }
    }, `Failed to process comment notification for post ${data.post_id}`);

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
      throw new ForbiddenException("You cannot update this comment");
    await this.repo.update(
      { id: id },
      {
        content: data.content,
        updated_at: new Date(),
      },
    );
    return this.repo.findOneBy({ id: id }) as Promise<Comment>;
  }

  /**
   * One page of a post's top-level comments, newest first, each with all of
   * its replies (oldest first) under `replies`.
   */
  async findByPostId(
    post_id: number,
    paging: PaginationQueryDto,
  ): Promise<Page<Comment & { reply_count: number }>> {
    try {
      const [comments, total] = await this.repo.findAndCount({
        where: { post_id, parent_id: IsNull() },
        relations: ["user"],
        order: { id: "DESC" },
        ...toTakeSkip(paging),
      });
      const replies = comments.length
        ? await this.repo.find({
            where: { parent_id: In(comments.map((c) => c.id)) },
            relations: ["user"],
            order: { id: "ASC" },
          })
        : [];
      const data = comments.map((comment) => {
        const own = replies.filter((r) => r.parent_id === comment.id);
        return Object.assign(comment, {
          replies: own,
          reply_count: own.length,
        });
      });
      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Error fetching comments");
    }
  }

  async findByPosterId(
    user_id: number,
    paging: PaginationQueryDto,
  ): Promise<Page<Comment>> {
    try {
      const [data, total] = await this.repo.findAndCount({
        where: { user_id },
        order: { id: "DESC" },
        ...toTakeSkip(paging),
      });
      return { data, total };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Error fetching comments");
    }
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
    try {
      const comment = await this.repo.findOneBy({ id });
      if (!comment) throw new NotFoundException("Comment not found");

      const post = await this.postRepo.findOneBy({ id: comment.post_id });

      // Check if user is either the comment author or the post author
      if (comment.user_id !== userId && post?.user_id !== userId) {
        throw new ForbiddenException("You cannot delete this comment");
      }

      // Deleting a comment deletes its replies too (ON DELETE CASCADE).
      const replyCount = await this.repo.countBy({ parent_id: id });
      await this.repo.delete({ id });
      if (post) {
        await this.postRepo.decrement(
          { id: comment.post_id },
          "comment_count",
          1 + replyCount,
        );
      }
      return { message: "Comment deleted successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Error deleting comment");
    }
  }
}
