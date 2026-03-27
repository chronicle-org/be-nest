import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { NotificationSettings } from "./notification-settings.entity";
import { In, Repository } from "typeorm";
import { UpdateNotificationSettingsDto } from "./dto/notifications.dto";

export const baseDefaultSettingsValues = {
  notify_comments: true,
  notify_likes: true,
  notify_follows: true,
  notify_bookmarks: true,
  notify_replies: true,
  notify_followed_posts_enabled: true,
};
@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSettings)
    private repo: Repository<NotificationSettings>,
  ) {}

  async getUserSettings(userId: number) {
    let settings = await this.repo.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      settings = this.repo.create({
        ...baseDefaultSettingsValues,
        notify_followed_posts_from_users: [],
        user_id: userId,
        created_at: new Date(),
      });
      await this.repo.save(settings);
    }

    return settings;
  }

  async getUserSettingsBulk(userIds: number[]) {
    let settings = await this.repo.find({
      where: { user_id: In(userIds) },
    });

    const foundUserIds = new Set(settings.map((s) => s.user_id));
    const missingUserIds = userIds.filter((id) => !foundUserIds.has(id));

    if (missingUserIds.length > 0) {
      try {
        await this.repo.insert(
          missingUserIds.map((userId) => ({
            ...baseDefaultSettingsValues,
            notify_followed_posts_from_users: [],
            user_id: userId,
            created_at: new Date(),
          })),
        );
      } catch (error) {
        console.warn("Some notification settings already exist", error);
      }
      const newlyInserted = await this.repo.find({
        where: { user_id: In(missingUserIds) },
      });
      settings = settings.concat(newlyInserted);
    }

    return settings;
  }

  async updateSettings(userId: number, payload: UpdateNotificationSettingsDto) {
    const settings = await this.repo.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      return this.repo.save(
        this.repo.create({
          user_id: userId,
          ...payload,
        }),
      );
    }

    Object.assign(settings, payload);
    return this.repo.save(settings);
  }
}
