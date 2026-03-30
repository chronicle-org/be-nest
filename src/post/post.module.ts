import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Post as PostEntity } from "./post.entity";
import { PostController } from "./post.controller";
import { PostService } from "./post.service";
import { User } from "src/user/user.entity";
import { NotificationModule } from "src/notifications/notification.module";

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, User]), NotificationModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
