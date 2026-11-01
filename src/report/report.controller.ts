import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import type { JwtPayload } from "src/auth/jwt.strategy";
import { CurrentUser } from "src/utils/decorator";
import { RATE_LIMIT } from "src/utils/constant";
import { Page } from "src/utils/pagination";
import { Report } from "./report.entity";
import { isAdmin, ReportService } from "./report.service";
import {
  CreateReportDto,
  FindReportsQueryDto,
  ResolveReportDto,
} from "./dto/report.dto";

@ApiTags("Reports")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("report")
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @ApiOperation({ summary: "Report a post or a comment" })
  @ApiResponse({ status: 201, description: "Report filed" })
  @Throttle({ default: RATE_LIMIT.REPORT.CREATE })
  @Post()
  async create(
    @Body() data: CreateReportDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.service.create(user.user_id, data);
    return { message: "Thanks, we'll take a look" };
  }

  @ApiOperation({
    summary: "Whether the current user can review reports",
  })
  @Get("/access")
  access(@CurrentUser() user: JwtPayload): { is_admin: boolean } {
    return { is_admin: isAdmin(user.user_id) };
  }

  @ApiOperation({
    summary: "List reports (admins only)",
    description: "Admins are the user ids in ADMIN_USER_IDS.",
  })
  @ApiResponse({ status: 403, description: "Not an admin" })
  @Get()
  findAll(
    @Query() query: FindReportsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Page<Report>> {
    return this.service.findAll(user.user_id, query.status, query);
  }

  @ApiOperation({
    summary: "Close a report (admins only)",
    description:
      "removed deletes the reported post or comment; dismissed keeps it.",
  })
  @ApiResponse({ status: 403, description: "Not an admin" })
  @Put("/:id")
  resolve(
    @Param("id", ParseIntPipe) id: number,
    @Body() data: ResolveReportDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.service.resolve(user.user_id, id, data.status);
  }
}
