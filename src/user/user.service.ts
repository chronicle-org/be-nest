import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "./user.entity";
import { addToJsonbArray, removeFromJsonbArray } from "src/utils/jsonb-array";
import { Post } from "../post/post.entity";
import { NotificationService } from "src/notifications/notification.service";
import { NotificationSettingsService } from "src/notifications/notification-settings.service";
import { NotificationGateway } from "src/notifications/notification.gateway";
import { NotificationType } from "src/notifications/notification.entity";

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

  findAll(): Promise<User[]> {
    return this.repo.find({
      order: {
        id: "ASC",
      },
    });
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

  async following(user_id: number): Promise<User[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const following = await this.repo.find({
      where: {
        id: In(user.following),
      },
    });
    return following;
  }

  async followers(user_id: number): Promise<User[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const followers = await this.repo.find({
      where: {
        id: In(user.followers),
      },
    });
    return followers;
  }

  async likes(user_id: number): Promise<Post[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const likes = await this.postRepo.find({
      where: {
        id: In(user.likes),
      },
    });
    return likes;
  }

  async bookmarks(user_id: number): Promise<Post[]> {
    const user = await this.findOne(user_id);
    if (!user) throw new NotFoundException();
    const bookmarks = await this.postRepo.find({
      where: {
        id: In(user.bookmarks),
      },
      relations: ["user"],
    });
    return bookmarks;
  }
}
