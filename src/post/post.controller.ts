import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { PostService } from "./post.service";
import { Post as PostEntity } from "./post.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";

@Controller("post")
export class PostController {
  constructor(private readonly service: PostService) {}

  @Get()
  findAll(): Promise<PostEntity[]> {
    return this.service.findAll();
  }

  @Get("/user/:user_id")
  findAllByUserId(
    @Param("user_id", ParseIntPipe) user_id: number,
  ): Promise<PostEntity[]> {
    return this.service.findAllByUserId(user_id);
  }

  @Get("/:id")
  findOne(@Param("id", ParseIntPipe) id: number): Promise<PostEntity | null> {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() post: Partial<PostEntity>,
    @CurrentUser() user: JwtPayload,
  ): Promise<PostEntity> {
    const postData = { ...post, user_id: user.user_id };
    return this.service.create(postData);
  }

  @Put("/:id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() post: Partial<PostEntity>,
    @CurrentUser() user: JwtPayload,
  ): Promise<PostEntity | null> {
    return this.service.update({ ...post, id, user_id: user.user_id });
  }

  @Delete("/:id")
  @UseGuards(JwtAuthGuard)
  delete(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.service.delete(id, user.user_id);
  }
}
