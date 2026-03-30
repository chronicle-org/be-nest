import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PagedResult, PostService } from "./post.service";
import { Post as PostEntity } from "./post.entity";
import { CreatePostDto } from "./dto/post.dto";
import { UpdatePostDto } from "./dto/post.dto";
import { FindPostsQueryDto } from "./dto/find-posts-query.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";
import type { InteractionType } from "src/utils/types";
import { User } from "src/user/user.entity";

@ApiTags("Posts")
@Controller("post")
export class PostController {
  constructor(private readonly service: PostService) {}

  @ApiOperation({ summary: "Get all posts with pagination and search" })
  @ApiResponse({ status: 200, description: "Paginated list of posts" })
  @Get()
  findAll(@Query() queryDto: FindPostsQueryDto): Promise<PagedResult> {
    return this.service.findAll(queryDto.page, queryDto.limit, queryDto.search);
  }

  @ApiOperation({ summary: "Get all posts by a specific user" })
  @ApiResponse({ status: 200, description: "User's posts" })
  @Get("/user/:user_id")
  findAllByUserId(
    @Param("user_id", ParseIntPipe) user_id: number,
    @Query() queryDto: FindPostsQueryDto,
  ): Promise<PagedResult> {
    return this.service.findAllByUserId(
      user_id,
      queryDto.page,
      queryDto.limit,
      queryDto.search,
    );
  }

  @ApiOperation({ summary: "Get a single post by ID" })
  @ApiResponse({ status: 200, description: "Post details" })
  @ApiResponse({ status: 404, description: "Post not found" })
  @Get("/:id")
  findOne(@Param("id", ParseIntPipe) id: number): Promise<PostEntity | null> {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: "Get draft posts of current user" })
  @ApiResponse({ status: 200, description: "List of draft posts" })
  @ApiBearerAuth("access-token")
  @Get("/user/:user_id/drafts")
  @UseGuards(JwtAuthGuard)
  getDrafts(
    @Param("user_id", ParseIntPipe) user_id: number,
    @Query() queryDto: FindPostsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PagedResult> {
    if (user.user_id !== user_id) {
      throw new ForbiddenException("Cannot access other user's drafts");
    }
    return this.service.getDrafts(user_id, queryDto.page, queryDto.limit);
  }

  @ApiOperation({ summary: "Create a new post" })
  @ApiResponse({ status: 201, description: "Post created successfully" })
  @ApiBearerAuth("access-token")
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() post: CreatePostDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PostEntity> {
    const postData = { ...post, user_id: user.user_id };
    return this.service.create(postData);
  }

  @ApiOperation({ summary: "Update a post" })
  @ApiResponse({ status: 200, description: "Post updated successfully" })
  @ApiBearerAuth("access-token")
  @Put("/:id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() post: UpdatePostDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PostEntity | null> {
    return this.service.update({ ...post, id, user_id: user.user_id });
  }

  @ApiOperation({ summary: "Delete a post" })
  @ApiResponse({ status: 200, description: "Post deleted successfully" })
  @ApiBearerAuth("access-token")
  @Delete("/:id")
  @UseGuards(JwtAuthGuard)
  delete(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.service.delete(id, user.user_id);
  }

  @ApiOperation({ summary: "Publish a draft post" })
  @ApiResponse({ status: 200, description: "Draft published successfully" })
  @ApiBearerAuth("access-token")
  @Put("/:id/publish")
  @UseGuards(JwtAuthGuard)
  publishDraft(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<PostEntity> {
    return this.service.publishDraft(id, user.user_id);
  }

  @ApiOperation({
    summary: "Interact with a post (like, bookmark, unlike, unbookmark)",
  })
  @ApiResponse({ status: 200, description: "Interaction successful" })
  @ApiBearerAuth("access-token")
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

  @ApiOperation({ summary: "Increment post counters (views, shares)" })
  @ApiResponse({ status: 200, description: "Counter incremented" })
  @Put("/counter/:action/:post_id")
  incrementCounter(
    @Param("action") action: "share" | "view",
    @Param("post_id", ParseIntPipe) post_id: number,
  ): Promise<PostEntity> {
    return this.service.incrementPostCount(post_id, action);
  }
}
