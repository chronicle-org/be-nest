import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, Max, Min } from "class-validator";

const MAX_LIMIT = 50;

export interface Page<T> {
  data: T[];
  total: number;
}

export class PaginationQueryDto {
  @ApiProperty({
    description: "Page number for pagination",
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: "Number of items per page",
    example: 20,
    required: false,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  @IsOptional()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = 20;
}

/** TypeORM `take`/`skip` for a page. */
export const toTakeSkip = ({ page, limit }: PaginationQueryDto) => ({
  take: limit,
  skip: (page - 1) * limit,
});
