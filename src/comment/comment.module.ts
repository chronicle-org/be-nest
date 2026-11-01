import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment } from "./comment.entity";
import { UserBlock } from "src/user/user-block.entity";
import { User } from "src/user/user.entity";
import { Post as PostEntity } from "src/post/post.entity";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";
import { NotificationModule } from "src/notifications/notification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, PostEntity, UserBlock, User]),
    NotificationModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
