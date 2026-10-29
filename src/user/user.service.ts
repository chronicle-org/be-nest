import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  Not,
  Repository,
} from "typeorm";
import { User } from "./user.entity";
import { addToJsonbArray, removeFromJsonbArray } from "src/utils/jsonb-array";
import { Post } from "../post/post.entity";
import { PostBookmark, PostLike } from "../post/post-interaction.entity";
import { NotificationService } from "src/notifications/notification.service";
import { NotificationSettingsService } from "src/notifications/notification-settings.service";
import { NotificationGateway } from "src/notifications/notification.gateway";
import { NotificationType } from "src/notifications/notification.entity";
import { Page, PaginationQueryDto, toTakeSkip } from "src/utils/pagination";

const FOLLOWING = {
  table: "user",
  column: "following",
  countColumn: "following_count",
} as const;
const FOLLOWERS = {
  table: "user",
  column: "followers",
  countColumn: "followers_count",
} as const;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    private notificationService: NotificationService,
    private notificationSettingsService: NotificationSettingsService,
    private notificationGateway: NotificationGateway,
  ) {}

  async update(id: number, data: Partial<User>): Promise<User> {
    await this.repo.update(
      { id },
      {
        ...data,
      },
    );
    return this.findOne(id) as Promise<User>;
  }

  async findAll(paging: PaginationQueryDto): Promise<Page<User>> {
    const [data, total] = await this.repo.findAndCount({
      order: { id: "ASC" },
      ...toTakeSkip(paging),
    });
    return { data, total };
  }

  async findOne(id: number): Promise<User | null> {
    // Email is hidden by default; only the single-profile lookup includes it.
    const userData = await this.repo
      .createQueryBuilder("user")
      .addSelect("user.email")
      .where({ id })
      .getOne();
    if (!userData) throw new NotFoundException();
    return userData;
  }

  /** A profile without the email, for anonymous viewers. */
  async findPublic(id: number): Promise<User> {
    const userData = await this.repo.findOneBy({ id });
    if (!userData) throw new NotFoundException();
    return userData;
  }

  /**
   * People to follow: for a logged-in viewer, those followed by the people they
   * follow (most shared connections first), then the most-followed users.
   * Never the viewer or anyone they already follow.
   */
  async suggestions(viewer_id: number | null, limit: number): Promise<User[]> {
    const viewer = viewer_id
      ? await this.repo.findOneBy({ id: viewer_id })
      : null;
    const exclude = new Set<number>(
      viewer ? [viewer.id, ...viewer.following] : [],
    );

    const ids: number[] = [];
    if (viewer?.following.length) {
      const rows: { id: number }[] = await this.repo.query(
        `SELECT (e)::int AS id
         FROM "user" f CROSS JOIN LATERAL jsonb_array_elements(f.following) e
         WHERE f.followers @> jsonb_build_array($1::int)
         GROUP BY 1
         ORDER BY COUNT(*) DESC, 1 DESC
         LIMIT $2`,
        [viewer.id, limit + exclude.size],
      );
      for (const { id } of rows)
        if (!exclude.has(id) && ids.length < limit) ids.push(id);
    }

    const byId = new Map(
      (ids.length ? await this.repo.findBy({ id: In(ids) }) : []).map((u) => [
        u.id,
        u,
      ]),
    );
    const result = ids.flatMap((id) => byId.get(id) ?? []);

    if (result.length < limit) {
      const skip = [...exclude, ...ids];
      const popular = await this.repo.find({
        where: skip.length ? { id: Not(In(skip)) } : {},
        order: { followers_count: "DESC", id: "DESC" },
        take: limit - result.length,
      });
      result.push(...popular);
    }
    return result;
  }

  async follow(follower_id: number, followee_id: number): Promise<User> {
    // Prevent self-follow
    if (follower_id === followee_id) {
      throw new BadRequestException("Cannot follow yourself");
    }

    // Both must exist; findOne throws 404 otherwise.
    await Promise.all([this.findOne(follower_id), this.findOne(followee_id)]);
    await this.repo.manager.transaction(async (manager) => {
      const added = await addToJsonbArray(
        manager,
        FOLLOWING,
        follower_id,
        followee_id,
      );
      if (!added) throw new BadRequestException("Already following this user");
      await addToJsonbArray(manager, FOLLOWERS, followee_id, follower_id);
    });

    void (async () => {
      try {
        const existNotif =
          await this.notificationService.findRecentNotificationsForUser(
            followee_id,
            follower_id,
            NotificationType.FOLLOW,
          );

        if (!existNotif) {
          try {
            const settings =
              await this.notificationSettingsService.getUserSettings(
                followee_id,
              );

            if (settings?.notify_follows !== false) {
              const notif = await this.notificationService.createNotification({
                recipient_id: followee_id,
                actor_id: follower_id,
                type: NotificationType.FOLLOW,
              });
              this.notificationGateway.sendNotificationToUser(
                followee_id,
                notif,
              );
            }
          } catch (error) {
            console.warn(
              "Failed to create notification for follow action",
              followee_id,
              error,
            );
          }
        }
      } catch (error) {
        console.warn(
          "Failed to check recent notifications for follow action",
          followee_id,
          error,
        );
      }
    })();

    return this.findOne(follower_id) as Promise<User>;
  }

  async unfollow(follower_id: number, followee_id: number): Promise<User> {
    await Promise.all([this.findOne(follower_id), this.findOne(followee_id)]);
    await this.repo.manager.transaction(async (manager) => {
      const removed = await removeFromJsonbArray(
        manager,
        FOLLOWING,
        follower_id,
        followee_id,
      );
      if (!removed) throw new BadRequestException("Not following this user");
      await removeFromJsonbArray(manager, FOLLOWERS, followee_id, follower_id);
    });
    return this.findOne(follower_id) as Promise<User>;
  }

  async following(
    user_id: number,
    paging: PaginationQueryDto,
  ): Promise<Page<User>> {
    const user = await this.findOne(user_id);
    return this.pageByIds(this.repo, user!.following, paging);
  }

  async followers(
    user_id: number,
    paging: PaginationQueryDto,
  ): Promise<Page<User>> {
    const user = await this.findOne(user_id);
    return this.pageByIds(this.repo, user!.followers, paging);
  }

  async likes(
    user_id: number,
    paging: PaginationQueryDto,
  ): Promise<Page<Post>> {
    await this.findOne(user_id);
    return this.pageByInteraction(PostLike, user_id, paging);
  }

  async bookmarks(
    user_id: number,
    paging: PaginationQueryDto,
  ): Promise<Page<Post>> {
    await this.findOne(user_id);
    return this.pageByInteraction(PostBookmark, user_id, paging, true);
  }

  /** One page of the posts a user liked or bookmarked, most recent first. */
  private async pageByInteraction(
    table: typeof PostLike | typeof PostBookmark,
    user_id: number,
    paging: PaginationQueryDto,
    withAuthor = false,
  ): Promise<Page<Post>> {
    const query = this.postRepo
      .createQueryBuilder("post")
      .innerJoin(
        table,
        "interaction",
        "interaction.post_id = post.id AND interaction.user_id = :user_id",
        { user_id },
      )
      .orderBy("interaction.created_at", "DESC")
      .addOrderBy("post.id", "DESC")
      // limit/offset, not take/skip: the only join is the many-to-one author,
      // so rows don't repeat, and take/skip can't order by a joined column.
      .limit(paging.limit)
      .offset((paging.page - 1) * paging.limit);
    if (withAuthor) query.leftJoinAndSelect("post.user", "user");
    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  /** One page of the rows whose ids are in a user's jsonb id array, newest id first. */
  private async pageByIds<T extends User | Post>(
    repo: Repository<T>,
    ids: number[],
    paging: PaginationQueryDto,
    relations: string[] = [],
  ): Promise<Page<T>> {
    if (!ids.length) return { data: [], total: 0 };
    const [data, total] = await repo.findAndCount({
      where: { id: In(ids) } as FindOptionsWhere<T>,
      order: { id: "DESC" } as FindOptionsOrder<T>,
      relations,
      ...toTakeSkip(paging),
    });
    return { data, total };
  }
}
