import {
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
  IsString,
  IsArray,
} from "class-validator";
import { NotificationType } from "../notification.entity";

export class getAllNotificationsForUserDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;
}

export class InsertNotificationDto {
  @IsNumber()
  recipient_id: number;

  @IsNumber()
  actor_id: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsNumber()
  @IsOptional()
  post_id?: number;

  @IsNumber()
  @IsOptional()
  comment_id?: number;

  @IsString()
  @IsOptional()
  message?: string;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  notify_comments?: boolean;

  @IsOptional()
  notify_likes?: boolean;

  @IsOptional()
  notify_follows?: boolean;

  @IsOptional()
  notify_bookmarks?: boolean;

  @IsOptional()
  notify_replies?: boolean;

  @IsOptional()
  notify_followed_posts_enabled?: boolean;

  @IsOptional()
  @IsArray()
  notify_followed_posts_from_users?: number[];
}
