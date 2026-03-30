import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "./user.entity";
import { Post } from "../post/post.entity";
import { NotificationService } from "src/notifications/notification.service";
import { NotificationSettingsService } from "src/notifications/notification-settings.service";
import { NotificationGateway } from "src/notifications/notification.gateway";
import { NotificationType } from "src/notifications/notification.entity";

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

  create(data: Partial<User>): Promise<User> {
    return this.repo.save(data);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    await this.repo.update(
      { id },
      {
        ...data,
      },
    );
    return this.repo.findOneBy({ id }) as Promise<User>;
  }

  findAll(): Promise<User[]> {
    return this.repo.find({
      order: {
        id: "ASC",
      },
    });
  }

  async findOne(id: number): Promise<User | null> {
    const userData = await this.repo.findOneBy({ id });
    if (!userData) throw new NotFoundException();
    return userData;
  }

  async follow(follower_id: number, followee_id: number): Promise<User> {
    // Prevent self-follow
    if (follower_id === followee_id) {
      throw new BadRequestException("Cannot follow yourself");
    }

    const follower = await this.findOne(follower_id);
    const followee = await this.findOne(followee_id);
    if (!follower || !followee) throw new NotFoundException();

    follower.following = follower.following || [];
    // Prevent duplicate follows
    if (follower.following.includes(followee_id)) {
      throw new BadRequestException("Already following this user");
    }

    follower.following.push(followee_id);
    follower.following_count++;
    followee.followers = followee.followers || [];
    followee.followers.push(follower_id);
    followee.followers_count++;
    await this.repo.save(follower);
    await this.repo.save(followee);

    void (async () => {
      const existNotif =
        await this.notificationService.findRecentNotificationsForUser(
          followee_id,
          follower_id,
          NotificationType.FOLLOW,
        );

      if (!existNotif) {
        try {
          const settings =
            await this.notificationSettingsService.getUserSettings(followee_id);

          if (settings?.notify_follows !== false) {
            const notif = await this.notificationService.createNotification({
              recipient_id: followee_id,
              actor_id: follower_id,
              type: NotificationType.FOLLOW,
            });
            this.notificationGateway.sendNotificationToUser(followee_id, notif);
          }
        } catch (error) {
          console.warn(
            "Failed to create notification for follow action",
            followee_id,
            error,
          );
        }
      }
    })();

    return follower;
  }

  async unfollow(follower_id: number, followee_id: number): Promise<User> {
    const follower = await this.findOne(follower_id);
    const followee = await this.findOne(followee_id);
    if (!follower || !followee) throw new NotFoundException();

    follower.following = follower.following || [];
    if (!follower.following.includes(followee_id)) {
      throw new BadRequestException("Not following this user");
    }

    follower.following = follower.following.filter((id) => id !== followee_id);
    follower.following_count--;
    followee.followers = followee.followers || [];
    followee.followers = followee.followers.filter((id) => id !== follower_id);
    followee.followers_count--;
    await this.repo.save(follower);
    await this.repo.save(followee);
    return follower;
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
