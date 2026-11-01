import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "src/utils/pagination";
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  type ReportReason,
  type ReportStatus,
} from "../report.entity";

export class CreateReportDto {
  @ApiProperty({
    description: "The post being reported (send this or comment_id)",
    required: false,
  })
  @IsOptional()
  @IsInt()
  post_id?: number;

  @ApiProperty({
    description: "The comment being reported (send this or post_id)",
    required: false,
  })
  @IsOptional()
  @IsInt()
  comment_id?: number;

  @ApiProperty({ enum: REPORT_REASONS, example: "spam" })
  @IsIn(REPORT_REASONS)
  reason: ReportReason;

  @ApiProperty({
    description: "Anything else the reviewer should know",
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class FindReportsQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: REPORT_STATUSES, required: false, default: "open" })
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status: ReportStatus = "open";
}

export class ResolveReportDto {
  @ApiProperty({
    enum: ["removed", "dismissed"],
    description:
      "removed deletes the reported post or comment; dismissed keeps it",
  })
  @IsIn(["removed", "dismissed"])
  status: "removed" | "dismissed";
}
