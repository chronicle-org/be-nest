import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "src/user/user.entity";
import { Post } from "src/post/post.entity";
import { Comment } from "src/comment/comment.entity";

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "misinformation",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "removed", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** A user flagging a post or a comment (exactly one of the two) for an admin to review. */
@Check("CHK_report_one_target", `("post_id" IS NULL) <> ("comment_id" IS NULL)`)
@Index(["status", "created_at"])
@Index(["post_id"])
@Index(["comment_id"])
@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reporter_id: number;

  @Column({ type: "integer", nullable: true })
  post_id: number | null;

  @Column({ type: "integer", nullable: true })
  comment_id: number | null;

  @Column({ type: "varchar", length: 20 })
  reason: ReportReason;

  @Column({ type: "varchar", length: 1000, default: "" })
  details: string;

  @Column({ type: "varchar", length: 20, default: "open" })
  status: ReportStatus;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @Column({ type: "timestamp", nullable: true })
  resolved_at: Date | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reporter_id" })
  reporter: User;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: Post | null;

  @ManyToOne(() => Comment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "comment_id" })
  comment: Comment | null;
}
