import { IsString, IsNotEmpty, MinLength, MaxLength } from "class-validator";

export class CreateCommentDto {
  @IsNotEmpty({ message: "Content is required" })
  @IsString()
  @MinLength(1, { message: "Content must not be empty" })
  @MaxLength(5000, { message: "Content must not exceed 5000 characters" })
  content: string;

  @IsNotEmpty({ message: "Post ID is required" })
  post_id: number;
}

export class UpdateCommentDto {
  @IsNotEmpty({ message: "Content is required" })
  @IsString()
  @MinLength(1, { message: "Content must not be empty" })
  @MaxLength(5000, { message: "Content must not exceed 5000 characters" })
  content: string;
}
