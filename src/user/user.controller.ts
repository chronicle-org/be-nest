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
import { Post as PostEntity } from "../post/post.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";

@Controller("user")
export class UserController {
  constructor(private readonly service: UserService) {}

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

  @UseGuards(JwtAuthGuard)
  @Post("/follow/:user_id")
  follow(
    @Param("user_id", ParseIntPipe) user_id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.service.follow(user.user_id, user_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/unfollow/:user_id")
  unfollow(
    @Param("user_id", ParseIntPipe) user_id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.service.unfollow(user.user_id, user_id);
  }

  @Get("/following/:user_id")
  following(@Param("user_id", ParseIntPipe) user_id: number): Promise<User[]> {
    return this.service.following(user_id);
  }

  @Get("/followers/:user_id")
  followers(@Param("user_id", ParseIntPipe) user_id: number): Promise<User[]> {
    return this.service.followers(user_id);
  }

  @Get("/likes/:user_id")
  likes(
    @Param("user_id", ParseIntPipe) user_id: number,
  ): Promise<PostEntity[]> {
    return this.service.likes(user_id);
  }

  @Get("/bookmarks/:user_id")
  bookmarks(
    @Param("user_id", ParseIntPipe) user_id: number,
  ): Promise<PostEntity[]> {
    return this.service.bookmarks(user_id);
  }
}
