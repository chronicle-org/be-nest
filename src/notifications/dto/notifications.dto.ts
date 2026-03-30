import {
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
  IsString,
  IsArray,
  IsBoolean,
  IsInt,
  Max,
} from "class-validator";
import { NotificationType } from "../notification.entity";

export class GetAllNotificationsForUserDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
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
  @IsBoolean()
  notify_comments?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_likes?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_follows?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_bookmarks?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_replies?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_followed_posts_enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  notify_followed_posts_from_users?: number[];
}

export class MarkNotificationsReadDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}
