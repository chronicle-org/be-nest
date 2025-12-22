import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PagedResult, PostService } from "./post.service";
import { Post as PostEntity } from "./post.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";
import type { InteractionType } from "src/utils/types";
import { User } from "src/user/user.entity";

@Controller("post")
export class PostController {
  constructor(private readonly service: PostService) {}

  @Get()
  findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ): Promise<PagedResult> {
    return this.service.findAll(page, limit, search);
  }

  @Get("/user/:user_id")
  findAllByUserId(
    @Param("user_id", ParseIntPipe) user_id: number,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ): Promise<PagedResult> {
    return this.service.findAllByUserId(user_id, page, limit, search);
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

  @Put("/interaction/:action_type/:post_id")
  @UseGuards(JwtAuthGuard)
  interaction(
    @Param("action_type")
    action_type: InteractionType,
    @Param("post_id", ParseIntPipe) post_id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ post: PostEntity; user: User } | null> {
    return this.service.interaction(action_type, post_id, user.user_id);
  }

  @Put("/counter/:action/:post_id")
  incrementCounter(
    @Param("action") action: "share" | "view",
    @Param("post_id", ParseIntPipe) post_id: number,
  ): Promise<PostEntity> {
    return this.service.incrementPostCount(post_id, action);
  }
}
