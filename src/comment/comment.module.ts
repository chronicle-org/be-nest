import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment } from "./comment.entity";
import { Post as PostEntity } from "src/post/post.entity";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";

@Module({
  imports: [TypeOrmModule.forFeature([Comment, PostEntity])],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
