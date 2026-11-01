import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Report } from "./report.entity";
import { ReportService } from "./report.service";
import { ReportController } from "./report.controller";
import { Post } from "src/post/post.entity";
import { Comment } from "src/comment/comment.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Report, Post, Comment])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
