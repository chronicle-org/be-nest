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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import { User } from "./user.entity";
import {
  FindUsersQueryDto,
  SuggestionsQueryDto,
  UpdateUserDto,
} from "./dto/user.dto";
import { Post as PostEntity } from "../post/post.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "src/auth/optional-jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";
import { Page, PaginationQueryDto } from "src/utils/pagination";

@ApiTags("Users")
@Controller("user")
export class UserController {
  constructor(private readonly service: UserService) {}

  @ApiOperation({
    summary: "Get all users, or search them",
    description:
      "With `search`, returns people whose name or @handle contains it, most followed first.",
  })
  @ApiResponse({ status: 200, description: "Paginated list of users" })
  @Get()
  findAll(@Query() query: FindUsersQueryDto): Promise<Page<User>> {
    return this.service.findAll(query, query.search);
  }

  @ApiOperation({ summary: "People the current user has blocked" })
  @ApiResponse({ status: 200, description: "Paginated list of users" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Get("/blocks")
  blocked(
    @Query() paging: PaginationQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Page<User>> {
    return this.service.blocked(user.user_id, paging);
  }

  @ApiOperation({
    summary: "Suggest people to follow",
    description:
      "For logged-in viewers, people followed by the people they follow come first. Never includes the viewer or anyone they already follow.",
  })
  @ApiResponse({ status: 200, description: "List of suggested users" })
  @ApiBearerAuth("access-token")
  @UseGuards(OptionalJwtAuthGuard)
  @Get("/suggestions")
  suggestions(
    @Query() query: SuggestionsQueryDto,
    @CurrentUser() viewer: JwtPayload | null,
  ): Promise<User[]> {
    return this.service.suggestions(viewer?.user_id ?? null, query.limit);
  }

  @ApiOperation({
    summary: "Get user by ID",
    description:
      "Public, so profile pages can be previewed and indexed. The email is only included for logged-in viewers.",
  })
  @ApiResponse({ status: 200, description: "User details" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBearerAuth("access-token")
  @UseGuards(OptionalJwtAuthGuard)
  @Get("/:id")
  find(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() viewer: JwtPayload | null,
  ): Promise<User | null> {
    return viewer ? this.service.findOne(id) : this.service.findPublic(id);
  }

  @ApiOperation({ summary: "Update current user profile" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Put()
  update(
    @Body() data: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.service.update(user.user_id, data);
  }

  @ApiOperation({ summary: "Follow a user" })
  @ApiResponse({ status: 200, description: "User followed successfully" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Post("/follow/:user_id")
  follow(
    @Param("user_id", ParseIntPipe) user_id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.service.follow(user.user_id, user_id);
  }

  @ApiOperation({ summary: "Unfollow a user" })
  @ApiResponse({ status: 200, description: "User unfollowed successfully" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Post("/unfollow/:user_id")
  unfollow(
    @Param("user_id", ParseIntPipe) user_id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<User> {
    return this.service.unfollow(user.user_id, user_id);
  }

  @ApiOperation({
    summary: "Block a user",
    description:
      "Also ends any follow between you. They can't follow you, comment on your posts or reply to you, and you stop getting notifications from them and seeing their comments.",
  })
  @ApiResponse({ status: 201, description: "User blocked" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Post("/block/:user_id")
  async block(
    @Param("user_id", ParseIntPipe) user_id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.service.block(user.user_id, user_id);
    return { message: "User blocked" };
  }

  @ApiOperation({ summary: "Unblock a user" })
  @ApiResponse({ status: 201, description: "User unblocked" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Post("/unblock/:user_id")
  async unblock(
    @Param("user_id", ParseIntPipe) user_id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    await this.service.unblock(user.user_id, user_id);
    return { message: "User unblocked" };
  }

  @ApiOperation({ summary: "Get users that a user is following" })
  @ApiResponse({ status: 200, description: "Paginated list of followed users" })
  @Get("/following/:user_id")
  following(
    @Param("user_id", ParseIntPipe) user_id: number,
    @Query() paging: PaginationQueryDto,
  ): Promise<Page<User>> {
    return this.service.following(user_id, paging);
  }

  @ApiOperation({ summary: "Get followers of a user" })
  @ApiResponse({ status: 200, description: "Paginated list of followers" })
  @Get("/followers/:user_id")
  followers(
    @Param("user_id", ParseIntPipe) user_id: number,
    @Query() paging: PaginationQueryDto,
  ): Promise<Page<User>> {
    return this.service.followers(user_id, paging);
  }

  @ApiOperation({ summary: "Get posts liked by a user" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of posts liked by user",
  })
  @Get("/likes/:user_id")
  likes(
    @Param("user_id", ParseIntPipe) user_id: number,
    @Query() paging: PaginationQueryDto,
  ): Promise<Page<PostEntity>> {
    return this.service.likes(user_id, paging);
  }

  @ApiOperation({ summary: "Get bookmarked posts of a user" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of user's bookmarked posts",
  })
  @Get("/bookmarks/:user_id")
  bookmarks(
    @Param("user_id", ParseIntPipe) user_id: number,
    @Query() paging: PaginationQueryDto,
  ): Promise<Page<PostEntity>> {
    return this.service.bookmarks(user_id, paging);
  }
}
