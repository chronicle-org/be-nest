import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ForeignKey,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "src/user/user.entity";
import { Comment } from "src/comment/comment.entity";

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @ForeignKey(() => User)
  @Column()
  user_id: number;

  @Column({ length: 255, default: "" })
  title: string;

  @Column({ length: 255, default: "" })
  sub_title: string;

  @Column({ type: "text", default: "" })
  content: string;

  @Column({ length: 255, default: "" })
  thumbnail_url: string;

  @Column({ default: 0 })
  comment_count: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @CreateDateColumn({ type: "timestamp" })
  updated_at: Date;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: "user_id" })
  user: User;
}
