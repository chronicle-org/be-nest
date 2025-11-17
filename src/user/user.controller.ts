import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { User } from "./user.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";

@Controller("user")
export class UserController {
  constructor(private readonly service: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(): Promise<User[]> {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get("/:id")
  find(@Param("id", ParseIntPipe) id: number): Promise<User | null> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: Partial<User>): Promise<User> {
    return this.service.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  update(
    @Body() data: Partial<User>,
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.service.update(user.user_id, data);
  }
}
