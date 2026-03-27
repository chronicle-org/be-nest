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
import { NotificationService } from "src/notifications/notification.service";
import { NotificationSettingsService } from "src/notifications/notification-settings.service";
import { NotificationGateway } from "src/notifications/notification.gateway";
import { NotificationType } from "src/notifications/notification.entity";

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

    const post = await this.postRepo.findOneBy({ id: data.post_id });
    if (post && !!data.user_id && post.user_id !== data.user_id) {
      const existingNotification =
        await this.notificationService.findRecentNotificationsForUser(
          post.user_id,
          data.user_id,
          NotificationType.COMMENT,
          3,
        );
      if (!existingNotification) {
        void (async () => {
          try {
            const postOwnerSettings =
              await this.notificationSettingsService.getUserSettings(
                post.user_id,
              );
            if (postOwnerSettings?.notify_comments !== false && data.user_id) {
              const notification =
                await this.notificationService.createNotification({
                  recipient_id: post.user_id,
                  actor_id: data.user_id,
                  type: NotificationType.COMMENT,
                  post_id: data.post_id,
                });
              this.notificationGateway.sendNotificationToUser(
                post.user_id,
                notification,
              );
            }
          } catch (error) {
            console.warn(
              "Failed to create notification settings for user",
              post.user_id,
              error,
            );
          }
        });
      }
    }

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
      // Note: find() returns empty array if no results, not null
      return comments;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("Error fetching comments");
    }
  }

  async findByPosterId(user_id: number): Promise<Comment[]> {
    try {
      const comments = await this.repo.findBy({ user_id });
      return comments;
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
        throw new UnauthorizedException("You cannot delete this comment");
      }

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
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Error deleting comment");
    }
  }
}
