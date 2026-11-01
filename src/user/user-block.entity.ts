import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { User } from "./user.entity";

/**
 * `blocker_id` blocked `blocked_id`: they can't follow each other, the
 * blocked user can't comment on the blocker's posts or reply to them, and the
 * blocker gets no notifications from them and doesn't see their comments.
 */
@Index(["blocked_id"])
@Entity()
export class UserBlock {
  @PrimaryColumn()
  blocker_id: number;

  @PrimaryColumn()
  blocked_id: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blocker_id" })
  blocker: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "blocked_id" })
  blocked: User;
}
