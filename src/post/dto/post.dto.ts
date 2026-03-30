import {
  IsString,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsUrl,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePostDto {
  @ApiProperty({
    description: "Post title",
    example: "My First Blog Post",
    required: false,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: "Post subtitle",
    example: "An introduction to blogging",
    required: false,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  sub_title?: string;

  @ApiProperty({
    description: "Post content (HTML or Markdown)",
    example: "<p>This is the main content...</p>",
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: "URL to post thumbnail/cover image",
    example: "https://example.com/thumbnail.jpg",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: "Invalid thumbnail URL" })
  @MaxLength(255)
  thumbnail_url?: string;

  @ApiProperty({
    description: "Post tags (comma-separated)",
    example: "tech,nodejs,javascript",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tags?: string;

  @ApiProperty({
    description: "Whether post is saved as draft",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;
}

export class UpdatePostDto {
  @ApiProperty({
    description: "Updated post title",
    example: "Updated Title",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: "Updated post subtitle",
    example: "Updated subtitle",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sub_title?: string;

  @ApiProperty({
    description: "Updated post content",
    example: "<p>Updated content...</p>",
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: "Updated thumbnail URL",
    example: "https://example.com/new-thumbnail.jpg",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsUrl({}, { message: "Invalid thumbnail URL" })
  @MaxLength(255)
  thumbnail_url?: string;

  @ApiProperty({
    description: "Updated tags",
    example: "updated,tags,here",
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tags?: string;

  @ApiProperty({
    description: "Post visibility status",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  visibility?: boolean;

  @ApiProperty({
    description: "Whether post is a draft",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;
}
