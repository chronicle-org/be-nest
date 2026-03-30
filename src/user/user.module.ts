import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { User } from "./user.entity";
import { Post } from "src/post/post.entity";
import { Comment } from "src/comment/comment.entity";
import { NotificationModule } from "src/notifications/notification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Post, Comment]),
    NotificationModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
