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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import { User } from "./user.entity";
import { UpdateUserDto } from "./dto/user.dto";
import { Post as PostEntity } from "../post/post.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/utils/decorator";
import type { JwtPayload } from "src/auth/jwt.strategy";

@ApiTags("Users")
@Controller("user")
export class UserController {
  constructor(private readonly service: UserService) {}

  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({ status: 200, description: "List of all users" })
  @Get()
  findAll(): Promise<User[]> {
    return this.service.findAll();
  }

  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({ status: 200, description: "User details" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiBearerAuth("access-token")
  @UseGuards(JwtAuthGuard)
  @Get("/:id")
  find(@Param("id", ParseIntPipe) id: number): Promise<User | null> {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  @Post()
  create(@Body() data: Partial<User>): Promise<User> {
    return this.service.create(data);
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

  @ApiOperation({ summary: "Get users that a user is following" })
  @ApiResponse({ status: 200, description: "List of followed users" })
  @Get("/following/:user_id")
  following(@Param("user_id", ParseIntPipe) user_id: number): Promise<User[]> {
    return this.service.following(user_id);
  }

  @ApiOperation({ summary: "Get followers of a user" })
  @ApiResponse({ status: 200, description: "List of followers" })
  @Get("/followers/:user_id")
  followers(@Param("user_id", ParseIntPipe) user_id: number): Promise<User[]> {
    return this.service.followers(user_id);
  }

  @ApiOperation({ summary: "Get posts liked by a user" })
  @ApiResponse({ status: 200, description: "List of posts liked by user" })
  @Get("/likes/:user_id")
  likes(
    @Param("user_id", ParseIntPipe) user_id: number,
  ): Promise<PostEntity[]> {
    return this.service.likes(user_id);
  }

  @ApiOperation({ summary: "Get bookmarked posts of a user" })
  @ApiResponse({ status: 200, description: "List of user's bookmarked posts" })
  @Get("/bookmarks/:user_id")
  bookmarks(
    @Param("user_id", ParseIntPipe) user_id: number,
  ): Promise<PostEntity[]> {
    return this.service.bookmarks(user_id);
  }
}
