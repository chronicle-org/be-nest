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
import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "../notification.entity";

export class GetAllNotificationsForUserDto {
  @ApiProperty({
    description: "Number of notifications to retrieve per page",
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiProperty({
    description: "Page number for pagination",
    example: 1,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  page?: number;
}

export class InsertNotificationDto {
  @ApiProperty({
    description: "ID of the notification recipient",
    example: 5,
  })
  @IsNumber()
  recipient_id: number;

  @ApiProperty({
    description: "ID of the user who triggered the notification",
    example: 3,
  })
  @IsNumber()
  actor_id: number;

  @ApiProperty({
    description: "Type of notification",
    enum: NotificationType,
    example: NotificationType.LIKE,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: "Related post ID (if applicable)",
    example: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  post_id?: number;

  @ApiProperty({
    description: "Related comment ID (if applicable)",
    example: 25,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  comment_id?: number;

  @ApiProperty({
    description: "Custom notification message",
    example: "Check out this new post!",
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;
}

export class UpdateNotificationSettingsDto {
  @ApiProperty({
    description: "Enable/disable comment notifications",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notify_comments?: boolean;

  @ApiProperty({
    description: "Enable/disable like notifications",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notify_likes?: boolean;

  @ApiProperty({
    description: "Enable/disable follow notifications",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notify_follows?: boolean;

  @ApiProperty({
    description: "Enable/disable bookmark notifications",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notify_bookmarks?: boolean;

  @ApiProperty({
    description: "Enable/disable reply notifications",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notify_replies?: boolean;

  @ApiProperty({
    description: "Enable/disable notifications for followed users' posts",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notify_followed_posts_enabled?: boolean;

  @ApiProperty({
    description:
      "List of user IDs to receive notifications from. Empty array means all followers.",
    example: [1, 2, 3],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  notify_followed_posts_from_users?: number[];
}

export class MarkNotificationsReadDto {
  @ApiProperty({
    description: "Array of notification IDs to mark as read",
    example: [1, 2, 3],
  })
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}
