import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { DataSource } from "typeorm";

@ApiTags("Health")
@Controller("health")
@SkipThrottle()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @ApiOperation({ summary: "Check that the API and its database are up" })
  @ApiResponse({ status: 200, description: "API and database are up" })
  @ApiResponse({ status: 503, description: "Database is unreachable" })
  @Get()
  async check(): Promise<{ status: "ok" }> {
    try {
      await this.dataSource.query("SELECT 1");
    } catch {
      throw new ServiceUnavailableException("Database is unreachable");
    }
    return { status: "ok" };
  }
}
