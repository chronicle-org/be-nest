import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCommentDto {
  @ApiProperty({
    description: "Comment content text",
    example: "This is a great post!",
    minLength: 1,
    maxLength: 5000,
  })
  @IsNotEmpty({ message: "Content is required" })
  @IsString()
  @MinLength(1, { message: "Content must not be empty" })
  @MaxLength(5000, { message: "Content must not exceed 5000 characters" })
  content: string;

  @ApiProperty({
    description: "ID of the post being commented on",
    example: 1,
  })
  @IsNotEmpty({ message: "Post ID is required" })
  post_id: number;

  @ApiProperty({
    description:
      "ID of the comment being replied to. Replying to a reply attaches to its top-level comment.",
    example: 12,
    required: false,
  })
  @IsOptional()
  @IsInt()
  parent_id?: number;
}

export class UpdateCommentDto {
  @ApiProperty({
    description: "Updated comment content",
    example: "Updated comment text",
    minLength: 1,
    maxLength: 5000,
  })
  @IsNotEmpty({ message: "Content is required" })
  @IsString()
  @MinLength(1, { message: "Content must not be empty" })
  @MaxLength(5000, { message: "Content must not exceed 5000 characters" })
  content: string;
}
