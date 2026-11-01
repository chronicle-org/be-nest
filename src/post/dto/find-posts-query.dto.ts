import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

const MAX_SEARCH_LENGTH = 100;
const MAX_LIMIT = 50;
const MAX_TAG_LENGTH = 30;

export const POST_SORTS = ["latest", "likes", "views"] as const;
export type PostSort = (typeof POST_SORTS)[number];

export class FindPostsQueryDto {
  @ApiProperty({
    description: "Search query to filter posts by title or content",
    example: "javascript tutorial",
    required: false,
    maxLength: MAX_SEARCH_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH, {
    message: `Search must not exceed ${MAX_SEARCH_LENGTH} characters`,
  })
  search?: string;

  @ApiProperty({
    description: "Only posts that have this tag",
    example: "javascript",
    required: false,
    maxLength: MAX_TAG_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TAG_LENGTH, {
    message: `Tag must not exceed ${MAX_TAG_LENGTH} characters`,
  })
  tag?: string;

  @ApiProperty({
    description: "Order of the results (newest first by default)",
    enum: POST_SORTS,
    required: false,
    default: "latest",
  })
  @IsOptional()
  @IsIn(POST_SORTS)
  sort?: PostSort = "latest";

  @ApiProperty({
    description: "Page number for pagination",
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: "Number of items per page",
    example: 10,
    required: false,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  @IsOptional()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = 10;
}
