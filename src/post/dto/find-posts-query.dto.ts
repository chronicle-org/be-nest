import { IsOptional, IsString, MaxLength, Min, Max } from "class-validator";

const MAX_SEARCH_LENGTH = 100;
const MAX_LIMIT = 50;

export class FindPostsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH, {
    message: `Search must not exceed ${MAX_SEARCH_LENGTH} characters`,
  })
  search?: string;

  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = 10;
}
