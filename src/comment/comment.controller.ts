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
import { CommentService } from "./comment.service";
import { Comment } from "./comment.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";

@Controller("comment")
export class CommentController {
  constructor(private readonly service: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createComment(
    @Body() data: Partial<Comment>,
    @CurrentUser() user: JwtPayload,
  ): Promise<Comment> {
    const commentData = { ...data, user_id: user.user_id };
    return this.service.create(commentData);
  }

  @Put("/:id")
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() data: Partial<Comment>,
    @CurrentUser() user: JwtPayload,
  ): Promise<Comment> {
    return this.service.update(id, data, user.user_id);
  }

  @Get("/:post_id")
  findCommentsByPostId(
    @Param("post_id", ParseIntPipe) post_id: number,
  ): Promise<Comment[]> {
    return this.service.findByPostId(post_id);
  }

  @Get("/user/:user_id")
  findCommentsByUserId(
    @Param("user_id", ParseIntPipe) user_id: number,
  ): Promise<Comment[]> {
    return this.service.findByPosterId(user_id);
  }

  @Delete("/:id")
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.service.delete(id, user.user_id);
  }
}
