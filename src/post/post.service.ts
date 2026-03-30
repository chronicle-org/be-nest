import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOperator, ILike, Repository } from "typeorm";
import { Post } from "./post.entity";
import { InteractionType } from "src/utils/types";
import { User } from "src/user/user.entity";
import { calculateReadingTime } from "src/utils";
import { NotificationGateway } from "src/notifications/notification.gateway";
import { NotificationService } from "src/notifications/notification.service";
import { NotificationSettingsService } from "src/notifications/notification-settings.service";
import { NotificationType } from "src/notifications/notification.entity";

export interface PagedResult {
  data: Post[];
  total: number;
}

interface InteractionHandlers {
  [key: string]: (
    post: Post,
    user: User,
    user_id: number,
  ) => void | Promise<void>;
}

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private repo: Repository<Post>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private notificationGateway: NotificationGateway,
    private notificationService: NotificationService,
    private notificationSettingsService: NotificationSettingsService,
  ) {}

  /**
   * Build search conditions for post queries
   */
  private buildSearchConditions(
    search: string,
    baseCondition?: Record<string, any>,
  ): Record<string, FindOperator<string> | boolean | number>[] {
    const searchTerms = search.split(/\s+/).filter((term) => term.length > 0);
    const base = baseCondition || {};

    if (searchTerms.length === 0) {
      return [base];
    }

    const conditions = [
      { ...base, title: ILike(`%${search}%`) },
      { ...base, sub_title: ILike(`%${search}%`) },
      ...searchTerms.map((term) => ({ ...base, tags: ILike(`%${term}%`) })),
    ];

    return conditions;
  }

  /**
   * Execute async task in background without blocking response
   */
  private runAsync(task: () => Promise<void>, errorContext: string): void {
    void task().catch((err) => {
      console.error(`${errorContext}:`, err);
    });
  }

  /**
   * Send notification for post interaction (like/bookmark)
   */
  private async sendInteractionNotification(
    recipient_id: number,
    actor_id: number,
    type: NotificationType,
    post_id: number,
    settingKey: "notify_likes" | "notify_bookmarks",
  ): Promise<void> {
    let notification =
      await this.notificationService.findRecentNotificationsForUser(
        recipient_id,
        actor_id,
        type,
      );

    if (!notification) {
      const settings =
        await this.notificationSettingsService.getUserSettings(recipient_id);
      if (settings?.[settingKey] !== false) {
        notification = await this.notificationService.createNotification({
          recipient_id,
          actor_id,
          type,
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
   * Handle post like interaction
   */
  private handleLike(post: Post, user: User, actor_id: number): void {
    post.likes = post.likes || [];
    user.likes = user.likes || [];

    if (post.likes.includes(actor_id)) {
      throw new BadRequestException("User already liked this post");
    }

    post.likes.push(actor_id);
    post.likes_count++;
    user.likes.push(post.id);
    user.likes_count++;

    if (post.user_id !== actor_id) {
      this.runAsync(
        () =>
          this.sendInteractionNotification(
            post.user_id,
            actor_id,
            NotificationType.LIKE,
            post.id,
            "notify_likes",
          ),
        `Failed to create like notification for user ${post.user_id}`,
      );
    }
  }

  /**
   * Handle post unlike interaction
   */
  private handleUnlike(post: Post, user: User, actor_id: number): void {
    post.likes = post.likes || [];
    user.likes = user.likes || [];

    if (!post.likes.includes(actor_id)) {
      throw new BadRequestException("User has not liked this post");
    }

    post.likes = post.likes.filter((id) => id !== actor_id);
    post.likes_count--;
    user.likes = user.likes.filter((id) => id !== post.id);
    user.likes_count--;
  }

  /**
   * Handle post bookmark interaction
   */
  private handleBookmark(post: Post, user: User, actor_id: number): void {
    post.bookmarks = post.bookmarks || [];
    user.bookmarks = user.bookmarks || [];

    if (post.bookmarks.includes(actor_id)) {
      throw new BadRequestException("User already bookmarked this post");
    }

    post.bookmarks.push(actor_id);
    post.bookmarks_count++;
    user.bookmarks.push(post.id);
    user.bookmarks_count++;

    if (post.user_id !== actor_id) {
      this.runAsync(
        () =>
          this.sendInteractionNotification(
            post.user_id,
            actor_id,
            NotificationType.BOOKMARK,
            post.id,
            "notify_bookmarks",
          ),
        `Failed to create bookmark notification for user ${post.user_id}`,
      );
    }
  }

  /**
   * Handle post unbookmark interaction
   */
  private handleUnbookmark(post: Post, user: User, actor_id: number): void {
    post.bookmarks = post.bookmarks || [];
    user.bookmarks = user.bookmarks || [];

    if (!post.bookmarks.includes(actor_id)) {
      throw new BadRequestException("User has not bookmarked this post");
    }

    post.bookmarks = post.bookmarks.filter((id) => id !== actor_id);
    post.bookmarks_count--;
    user.bookmarks = user.bookmarks.filter((id) => id !== post.id);
    user.bookmarks_count--;
  }

  async create(data: Partial<Post>): Promise<Post> {
    const readingTime = data.content ? calculateReadingTime(data.content) : 0;

    const postData: Partial<Post> = {
      user_id: data.user_id,
      content: data.content,
      created_at: new Date(),
      updated_at: new Date(),
      title: data.title,
      sub_title: data.sub_title,
      thumbnail_url: data.thumbnail_url,
      is_draft: data.is_draft || false,
      reading_time: readingTime,
    };

    const savedPost = await this.repo.save(postData);

    if (!savedPost.is_draft) {
      const author = await this.userRepo.findOne({
        where: { id: savedPost.user_id },
      });
      if (author) {
        savedPost.user = author;
        this.sendFollowerNotifications(savedPost);
      }
    }

    return savedPost;
  }

  async update(data: Partial<Post>): Promise<Post> {
    try {
      const postData = await this.repo.findOneBy({ id: data.id! });
      if (!postData) throw new NotFoundException("Post not found");
      else if (postData.user_id !== data.user_id)
        throw new UnauthorizedException("Unauthorized to update this post");

      const readingTime = data.content
        ? calculateReadingTime(data.content)
        : postData.reading_time;

      await this.repo.update(
        { id: data.id },
        {
          content: data.content,
          title: data.title,
          sub_title: data.sub_title,
          thumbnail_url: data.thumbnail_url,
          updated_at: new Date(),
          visibility: data.visibility,
          is_draft:
            data.is_draft !== undefined ? data.is_draft : postData.is_draft,
          reading_time: readingTime,
        },
      );
      return this.repo.findOneBy({ id: data.id! }) as Promise<Post>;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error updating post");
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Promise<PagedResult> {
    const skip = (page - 1) * limit;
    const searchConditions = this.buildSearchConditions(search, {
      is_draft: false,
    });

    const [data, total] = await this.repo.findAndCount({
      where: searchConditions,
      relations: ["user"],
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return { data, total };
  }

  async findAllByUserId(
    user_id: number,
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Promise<PagedResult> {
    const skip = (page - 1) * limit;
    const searchConditions = this.buildSearchConditions(search, { user_id });

    const [data, total] = await this.repo.findAndCount({
      where: searchConditions,
      relations: ["user"],
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return { data, total };
  }

  async getDrafts(
    user_id: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<PagedResult> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repo.findAndCount({
      where: { user_id, is_draft: true },
      relations: ["user"],
      order: { id: "DESC" },
      take: limit,
      skip: skip,
    });

    return { data, total };
  }

  async publishDraft(post_id: number, user_id: number): Promise<Post> {
    try {
      const post = await this.repo.findOneBy({ id: post_id });
      if (!post) throw new NotFoundException("Post not found");
      if (post.user_id !== user_id)
        throw new UnauthorizedException("Unauthorized to publish this post");
      if (!post.is_draft)
        throw new BadRequestException("This post is not a draft");

      post.is_draft = false;
      post.updated_at = new Date();
      await this.repo.save(post);
      return post;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error publishing draft");
    }
  }

  async findOne(id: number): Promise<Post | null> {
    try {
      const post = await this.repo.findOne({
        where: { id },
        relations: ["user"],
      });
      if (!post) throw new NotFoundException("Post not found");
      return post;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error fetching post");
    }
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
    try {
      const post = await this.repo.findOneBy({ id });
      if (!post) throw new NotFoundException("Post not found");
      else if (post.user_id !== userId)
        throw new UnauthorizedException("Unauthorized to update this post");
      await this.repo.delete({ id });
      return { message: "Post deleted successfully" };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("Error deleting post");
    }
  }

  async interaction(
    action_type: InteractionType,
    post_id: number,
    user_id: number,
  ): Promise<{ post: Post; user: User } | null> {
    try {
      const [post, user] = await Promise.all([
        this.repo.findOneBy({ id: post_id }),
        this.userRepo.findOneBy({ id: user_id }),
      ]);

      if (!post) throw new NotFoundException("Post not found");
      if (!user) throw new NotFoundException("User not found");

      const handlers: InteractionHandlers = {
        like: (p, u, uid) => this.handleLike(p, u, uid),
        unlike: (p, u, uid) => this.handleUnlike(p, u, uid),
        bookmark: (p, u, uid) => this.handleBookmark(p, u, uid),
        unbookmark: (p, u, uid) => this.handleUnbookmark(p, u, uid),
      };

      const handler = handlers[action_type];
      if (!handler) {
        throw new BadRequestException(`Invalid action type: ${action_type}`);
      }

      await handler(post, user, user_id);

      await Promise.all([this.repo.save(post), this.userRepo.save(user)]);

      return { post, user };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Error interacting with post");
    }
  }

  async incrementPostCount(
    post_id: number,
    action: "share" | "view",
  ): Promise<Post> {
    const countField = action === "share" ? "share_count" : "view_count";
    try {
      const post = await this.repo.findOneBy({ id: post_id });
      if (!post) throw new NotFoundException("Post not found");
      post[countField]++;
      await this.repo.save(post);
      return post;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Error ${action} post`);
    }
  }

  private sendFollowerNotifications(post: Post): void {
    this.runAsync(async () => {
      if (!post?.user?.followers || post.user.followers.length === 0) {
        return;
      }

      const followerIds = post.user.followers;
      const settings =
        await this.notificationSettingsService.getUserSettingsBulk(followerIds);

      // Filter followers who have enabled post notifications
      const eligibleFollowers = settings
        .filter(
          (setting) =>
            setting.notify_followed_posts_enabled &&
            (!setting.notify_followed_posts_from_users.length ||
              setting.notify_followed_posts_from_users.includes(post.user_id)),
        )
        .map((setting) => setting.user_id);

      if (eligibleFollowers.length === 0) return;

      // Find recent notifications to avoid duplicates
      const recentNotifications =
        await this.notificationService.findRecentNotificationsForUserBulk(
          eligibleFollowers,
          post.user_id,
          NotificationType.POST,
        );

      const notifiedFollowerIds = new Set(
        recentNotifications.map((notif) => notif.recipient_id),
      );

      const followersToNotify = eligibleFollowers.filter(
        (followerId) => !notifiedFollowerIds.has(followerId),
      );

      if (followersToNotify.length === 0) return;

      // Create and send notifications in one step
      const notifications =
        await this.notificationService.createNotificationBulk(
          followersToNotify.map((followerId) => ({
            recipient_id: followerId,
            actor_id: post.user_id,
            type: NotificationType.POST,
            post_id: post.id,
          })),
        );

      this.notificationGateway.sendNotificationToUserBulk(notifications);
    }, "Failed to send follower notifications");
  }
}
