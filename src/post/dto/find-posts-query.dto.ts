import { IsOptional, IsString, MaxLength, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

const MAX_SEARCH_LENGTH = 100;
const MAX_LIMIT = 50;

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
