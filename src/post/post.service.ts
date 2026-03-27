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
import {
  Notification,
  NotificationType,
} from "src/notifications/notification.entity";

export interface PagedResult {
  data: Post[];
  total: number;
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
    const searchTerms = search.split(/\s+/).filter((term) => term.length > 0);

    let searchConditions: Record<string, FindOperator<string> | boolean>[] = [];

    if (searchTerms.length > 0) {
      searchConditions = [
        { title: ILike(`%${search}%`), is_draft: false },
        { sub_title: ILike(`%${search}%`), is_draft: false },
        ...searchTerms.map((term) => ({
          tags: ILike(`%${term}%`),
          is_draft: false,
        })),
      ];
    } else {
      searchConditions = [{ is_draft: false }];
    }

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

    const baseCondition = { user_id };

    let searchConditions: Record<string, FindOperator<string> | number>[] = [];
    const searchTerms = search.split(/\s+/).filter((term) => term.length > 0);

    if (searchTerms.length > 0) {
      searchConditions = [
        { ...baseCondition, title: ILike(`%${search}%`) },
        { ...baseCondition, sub_title: ILike(`%${search}%`) },
      ];

      for (const term of searchTerms) {
        searchConditions.push({ ...baseCondition, tags: ILike(`%${term}%`) });
      }
    } else {
      searchConditions = [{ ...baseCondition }];
    }

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
      const post = await this.repo.findOneBy({ id: post_id });
      const user = await this.userRepo.findOneBy({ id: user_id });
      if (!post) throw new NotFoundException("Post not found");
      else if (!user) throw new NotFoundException("User not found");
      let notification: Notification | null = null;
      switch (action_type) {
        case "like":
          post.likes = post.likes || [];
          user.likes = user.likes || [];
          if (post.likes.includes(user_id))
            throw new BadRequestException("User already liked this post");
          post.likes.push(user_id);
          post.likes_count++;
          user.likes.push(post_id);
          user.likes_count++;
          if (post.user_id !== user_id) {
            notification =
              await this.notificationService.findRecentNotificationsForUser(
                post.user_id,
                user_id,
                NotificationType.LIKE,
              );
            if (!notification) {
              const postOwnerSettings =
                await this.notificationSettingsService.getUserSettings(
                  post.user_id,
                );
              if (postOwnerSettings?.notify_likes !== false) {
                notification =
                  await this.notificationService.createNotification({
                    recipient_id: post.user_id,
                    actor_id: user_id,
                    type: NotificationType.LIKE,
                    post_id: post.id,
                  });
                this.notificationGateway.sendNotificationToUser(
                  post.user_id,
                  notification,
                );
              }
            }
          }
          break;
        case "unlike":
          post.likes = post.likes || [];
          user.likes = user.likes || [];
          if (!post.likes.includes(user_id))
            throw new BadRequestException("User has not liked this post");
          post.likes = post.likes.filter((id) => id !== user_id);
          post.likes_count--;
          user.likes = user.likes.filter((id) => id !== post_id);
          user.likes_count--;
          break;
        case "bookmark":
          post.bookmarks = post.bookmarks || [];
          user.bookmarks = user.bookmarks || [];
          if (post.bookmarks.includes(user_id))
            throw new BadRequestException("User already bookmarked this post");
          post.bookmarks.push(user_id);
          post.bookmarks_count++;
          user.bookmarks.push(post_id);
          user.bookmarks_count++;
          if (post.user_id !== user_id) {
            notification =
              await this.notificationService.findRecentNotificationsForUser(
                post.user_id,
                user_id,
                NotificationType.BOOKMARK,
              );
            if (!notification) {
              const postOwnerSettings =
                await this.notificationSettingsService.getUserSettings(
                  post.user_id,
                );
              if (postOwnerSettings?.notify_bookmarks !== false) {
                notification =
                  await this.notificationService.createNotification({
                    recipient_id: post.user_id,
                    actor_id: user_id,
                    type: NotificationType.BOOKMARK,
                    post_id: post.id,
                  });
                this.notificationGateway.sendNotificationToUser(
                  post.user_id,
                  notification,
                );
              }
            }
          }
          break;
        case "unbookmark":
          post.bookmarks = post.bookmarks || [];
          user.bookmarks = user.bookmarks || [];
          if (!post.bookmarks.includes(user_id))
            throw new BadRequestException("User has not bookmarked this post");
          post.bookmarks = post.bookmarks.filter((id) => id !== user_id);
          post.bookmarks_count--;
          user.bookmarks = user.bookmarks.filter((id) => id !== post_id);
          user.bookmarks_count--;
          break;
      }
      await this.repo.save(post);
      await this.userRepo.save(user);
      return { post, user };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
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
    // Fire and forget - run notifications asynchronously
    void (async () => {
      try {
        if (!post?.user?.followers || post.user.followers.length === 0) {
          return;
        }

        const followers = post.user.followers;

        if (followers.length === 0) {
          return;
        }
        try {
          const followersSettings =
            await this.notificationSettingsService.getUserSettingsBulk(
              followers,
            );
          const followersFollowedPostsEnabled = followersSettings
            .filter(
              (setting) =>
                setting.notify_followed_posts_enabled &&
                (!setting.notify_followed_posts_from_users.length ||
                  setting.notify_followed_posts_from_users.includes(
                    post.user_id,
                  )),
            )
            .map((setting) => setting.user_id);

          if (followersFollowedPostsEnabled.length === 0) {
            return;
          }
          const recent =
            await this.notificationService.findRecentNotificationsForUserBulk(
              followersFollowedPostsEnabled,
              post.user_id,
              NotificationType.POST,
            );

          const recentRecipientIds = new Set(
            recent.map((notif) => notif.recipient_id),
          );

          const followersToNotify = followersFollowedPostsEnabled.filter(
            (followerId) => !recentRecipientIds.has(followerId),
          );

          if (followersToNotify.length === 0) {
            return;
          }

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
        } catch (err) {
          console.error(`Failed to notify followers:`, err);
        }
      } catch (err) {
        console.error("Error sending follower notifications:", err);
      }
    })();
  }
}
