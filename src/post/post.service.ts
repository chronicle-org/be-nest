import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  FindOperator,
  FindOptionsOrder,
  ILike,
  In,
  Not,
  Raw,
  Repository,
} from "typeorm";
import { Post } from "./post.entity";
import { InteractionType } from "src/utils/types";
import { User } from "src/user/user.entity";
import { calculateReadingTime } from "src/utils";
import { sanitizeRichText } from "src/utils/sanitize-html";
import { addToJsonbArray, removeFromJsonbArray } from "src/utils/jsonb-array";
import { NotificationGateway } from "src/notifications/notification.gateway";
import { NotificationService } from "src/notifications/notification.service";
import { NotificationSettingsService } from "src/notifications/notification-settings.service";
import { NotificationType } from "src/notifications/notification.entity";
import type { PostSort } from "./dto/find-posts-query.dto";
import { PostBookmark, PostLike } from "./post-interaction.entity";

export interface PagedResult {
  data: Post[];
  total: number;
}

export type PostListOptions = {
  tag?: string;
  sort?: PostSort;
};

const SORT_ORDER: Record<PostSort, FindOptionsOrder<Post>> = {
  latest: { id: "DESC" },
  likes: { likes_count: "DESC", id: "DESC" },
  views: { view_count: "DESC", id: "DESC" },
};

/**
 * Matches posts whose comma-separated tags include `tag` exactly, so
 * "java" doesn't also match "javascript". `key` keeps parameter names apart
 * when one query checks several tags.
 */
const hasTag = (tag: string, key = 0) => {
  const param = `tagPattern${key}`;
  const escaped = tag
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[%_\\]/g, "\\$&");
  return Raw(
    (column) =>
      `(',' || REPLACE(LOWER(${column}), ' ', '') || ',') LIKE :${param}`,
    { [param]: `%,${escaped},%` },
  );
};

const parseTags = (tags?: string | null): string[] =>
  (tags || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

type InteractionConfig = {
  postColumn: "likes" | "bookmarks";
  userColumn: "likes" | "bookmarks";
  table: typeof PostLike | typeof PostBookmark;
  add: boolean;
  notify?: {
    type: NotificationType;
    settingKey: "notify_likes" | "notify_bookmarks";
  };
  conflictMessage: string;
};

const INTERACTIONS: Record<InteractionType, InteractionConfig> = {
  like: {
    postColumn: "likes",
    userColumn: "likes",
    table: PostLike,
    add: true,
    notify: { type: NotificationType.LIKE, settingKey: "notify_likes" },
    conflictMessage: "User already liked this post",
  },
  unlike: {
    postColumn: "likes",
    userColumn: "likes",
    table: PostLike,
    add: false,
    conflictMessage: "User has not liked this post",
  },
  bookmark: {
    postColumn: "bookmarks",
    userColumn: "bookmarks",
    table: PostBookmark,
    add: true,
    notify: {
      type: NotificationType.BOOKMARK,
      settingKey: "notify_bookmarks",
    },
    conflictMessage: "User already bookmarked this post",
  },
  unbookmark: {
    postColumn: "bookmarks",
    userColumn: "bookmarks",
    table: PostBookmark,
    add: false,
    conflictMessage: "User has not bookmarked this post",
  },
};

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

  async create(data: Partial<Post>): Promise<Post> {
    const readingTime = data.content ? calculateReadingTime(data.content) : 0;

    const postData: Partial<Post> = {
      user_id: data.user_id,
      content: sanitizeRichText(data.content),
      created_at: new Date(),
      updated_at: new Date(),
      title: sanitizeRichText(data.title),
      sub_title: sanitizeRichText(data.sub_title),
      thumbnail_url: data.thumbnail_url,
      tags: data.tags,
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
        throw new ForbiddenException("You cannot update this post");

      const readingTime = data.content
        ? calculateReadingTime(data.content)
        : postData.reading_time;

      const isPublishing = postData.is_draft && data.is_draft === false;

      await this.repo.update(
        { id: data.id },
        {
          content: sanitizeRichText(data.content),
          title: sanitizeRichText(data.title),
          sub_title: sanitizeRichText(data.sub_title),
          thumbnail_url: data.thumbnail_url,
          tags: data.tags,
          updated_at: new Date(),
          visibility: data.visibility,
          is_draft:
            data.is_draft !== undefined ? data.is_draft : postData.is_draft,
          reading_time: readingTime,
        },
      );
      const updated = (await this.repo.findOneBy({ id: data.id! })) as Post;
      if (isPublishing) this.notifyFollowersOfPublish(updated);
      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Error updating post");
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    { tag, sort = "latest" }: PostListOptions = {},
  ): Promise<PagedResult> {
    const skip = (page - 1) * limit;
    const searchConditions = this.buildSearchConditions(search, {
      is_draft: false,
      ...(tag ? { tags: hasTag(tag) } : {}),
    });

    const [data, total] = await this.repo.findAndCount({
      where: searchConditions,
      relations: ["user"],
      order: SORT_ORDER[sort],
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
    { tag, sort = "latest" }: PostListOptions = {},
  ): Promise<PagedResult> {
    const skip = (page - 1) * limit;
    const searchConditions = this.buildSearchConditions(search, {
      user_id,
      is_draft: false,
      ...(tag ? { tags: hasTag(tag) } : {}),
    });

    const [data, total] = await this.repo.findAndCount({
      where: searchConditions,
      relations: ["user"],
      order: SORT_ORDER[sort],
      take: limit,
      skip: skip,
    });

    return { data, total };
  }

  /** Published posts from the writers `user_id` follows, newest first. */
  async findFollowing(
    user_id: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<PagedResult> {
    const user = await this.userRepo.findOneBy({ id: user_id });
    const following = user?.following ?? [];
    if (following.length === 0) return { data: [], total: 0 };

    const [data, total] = await this.repo.findAndCount({
      where: { user_id: In(following), is_draft: false },
      relations: ["user"],
      order: { id: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { data, total };
  }

  /**
   * Posts to read next: ones sharing a tag with this post (most liked first),
   * topped up with the author's latest posts when there aren't enough.
   */
  async findRelated(id: number, limit: number = 3): Promise<Post[]> {
    const post = await this.repo.findOneBy({ id, is_draft: false });
    if (!post) throw new NotFoundException("Post not found");

    const tags = parseTags(post.tags);
    const related = tags.length
      ? await this.repo.find({
          where: tags.map((tag, i) => ({
            id: Not(id),
            is_draft: false,
            tags: hasTag(tag, i),
          })),
          relations: ["user"],
          order: SORT_ORDER.likes,
          take: limit,
        })
      : [];

    if (related.length < limit) {
      const fromAuthor = await this.repo.find({
        where: {
          id: Not(In([id, ...related.map((p) => p.id)])),
          user_id: post.user_id,
          is_draft: false,
        },
        relations: ["user"],
        order: { id: "DESC" },
        take: limit - related.length,
      });
      related.push(...fromAuthor);
    }

    return related;
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
        throw new ForbiddenException("You cannot publish this post");
      if (!post.is_draft)
        throw new BadRequestException("This post is not a draft");

      post.is_draft = false;
      post.updated_at = new Date();
      await this.repo.save(post);
      this.notifyFollowersOfPublish(post);
      return post;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Error publishing draft");
    }
  }

  async findOne(id: number, viewer_id?: number): Promise<Post | null> {
    try {
      const post = await this.repo.findOne({
        where: { id },
        relations: ["user"],
      });
      // Drafts are only visible to their author.
      if (!post || (post.is_draft && post.user_id !== viewer_id))
        throw new NotFoundException("Post not found");
      return post;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Error fetching post");
    }
  }

  async delete(id: number, userId: number): Promise<{ message: string }> {
    try {
      const post = await this.repo.findOneBy({ id });
      if (!post) throw new NotFoundException("Post not found");
      else if (post.user_id !== userId)
        throw new ForbiddenException("You cannot delete this post");
      await this.repo.delete({ id });
      return { message: "Post deleted successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Error deleting post");
    }
  }

  async interaction(
    action_type: InteractionType,
    post_id: number,
    user_id: number,
  ): Promise<{ post: Post; user: User } | null> {
    const config = INTERACTIONS[action_type];
    if (!config) {
      throw new BadRequestException(`Invalid action type: ${action_type}`);
    }

    try {
      const post = await this.repo.findOneBy({ id: post_id });
      if (!post) throw new NotFoundException("Post not found");

      // Both arrays change in one transaction with atomic UPDATEs, so
      // simultaneous clicks can't drop each other's likes or bookmarks.
      await this.repo.manager.transaction(async (manager) => {
        const change = config.add ? addToJsonbArray : removeFromJsonbArray;
        const postChanged = await change(
          manager,
          {
            table: "post",
            column: config.postColumn,
            countColumn: `${config.postColumn}_count`,
          },
          post_id,
          user_id,
        );
        if (!postChanged) throw new BadRequestException(config.conflictMessage);
        await change(
          manager,
          {
            table: "user",
            column: config.userColumn,
            countColumn: `${config.userColumn}_count`,
          },
          user_id,
          post_id,
        );
        if (config.add) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(config.table)
            .values({ user_id, post_id })
            .orIgnore()
            .execute();
        } else {
          await manager.delete(config.table, { user_id, post_id });
        }
      });

      const notify = config.notify;
      if (notify && post.user_id !== user_id) {
        this.runAsync(
          () =>
            this.sendInteractionNotification(
              post.user_id,
              user_id,
              notify.type,
              post_id,
              notify.settingKey,
            ),
          `Failed to create ${action_type} notification for user ${post.user_id}`,
        );
      }

      const [updatedPost, user] = await Promise.all([
        this.repo.findOneByOrFail({ id: post_id }),
        this.userRepo.findOneByOrFail({ id: user_id }),
      ]);
      return { post: updatedPost, user };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Error interacting with post");
    }
  }

  async incrementPostCount(
    post_id: number,
    action: "share" | "view",
    viewer_id?: number,
  ): Promise<Post> {
    const countField = action === "share" ? "share_count" : "view_count";
    try {
      // Writers reading their own post shouldn't inflate its view count.
      if (action === "view" && viewer_id !== undefined) {
        const post = await this.repo.findOneBy({ id: post_id });
        if (!post) throw new NotFoundException("Post not found");
        if (post.user_id === viewer_id) return post;
      }
      const result = await this.repo.increment({ id: post_id }, countField, 1);
      if (!result.affected) throw new NotFoundException("Post not found");
      return this.repo.findOneByOrFail({ id: post_id });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Error ${action} post`);
    }
  }

  /**
   * Tells followers about a draft that just went public. Posts created as
   * published notify from create(); drafts only notify once they're published.
   */
  private notifyFollowersOfPublish(post: Post): void {
    this.runAsync(async () => {
      const author = await this.userRepo.findOne({
        where: { id: post.user_id },
      });
      if (!author) return;
      post.user = author;
      this.sendFollowerNotifications(post);
    }, "Failed to load author for publish notifications");
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
