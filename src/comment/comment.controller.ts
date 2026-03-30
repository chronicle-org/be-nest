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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CommentService } from "./comment.service";
import { Comment } from "./comment.entity";
import { CreateCommentDto } from "./dto/comment.dto";
import { UpdateCommentDto } from "./dto/comment.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";

@ApiTags("Comments")
@Controller("comment")
export class CommentController {
  constructor(private readonly service: CommentService) {}

  @ApiOperation({ summary: "Create a new comment on a post" })
  @ApiResponse({ status: 201, description: "Comment created successfully" })
  @ApiBearerAuth("access-token")
  @Post()
  @UseGuards(JwtAuthGuard)
  createComment(
    @Body() data: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Comment> {
    const commentData = { ...data, user_id: user.user_id };
    return this.service.create(commentData);
  }

  @ApiOperation({ summary: "Update an existing comment" })
  @ApiResponse({ status: 200, description: "Comment updated successfully" })
  @ApiBearerAuth("access-token")
  @Put("/:id")
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param("id", ParseIntPipe) id: number,
    @Body() data: UpdateCommentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Comment> {
    return this.service.update(id, data, user.user_id);
  }

  @ApiOperation({ summary: "Get all comments on a post" })
  @ApiResponse({ status: 200, description: "List of comments on post" })
  @Get("/post/:post_id")
  findCommentsByPostId(
    @Param("post_id", ParseIntPipe) post_id: number,
  ): Promise<Comment[]> {
    return this.service.findByPostId(post_id);
  }

  @ApiOperation({ summary: "Get all comments made by a user" })
  @ApiResponse({ status: 200, description: "List of user's comments" })
  @Get("/user/:user_id")
  findCommentsByUserId(
    @Param("user_id", ParseIntPipe) user_id: number,
  ): Promise<Comment[]> {
    return this.service.findByPosterId(user_id);
  }

  @ApiOperation({ summary: "Delete a comment" })
  @ApiResponse({ status: 200, description: "Comment deleted successfully" })
  @ApiBearerAuth("access-token")
  @Delete("/:id")
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.service.delete(id, user.user_id);
  }
}
