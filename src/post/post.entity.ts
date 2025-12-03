import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @Column({ length: 255, default: "" })
  tags: string; // Comma-separated string of tags

  @Column({ default: true })
  visibility: boolean;

  @Column({ default: 0 })
  bookmarks_count: number;

  @Column({ type: "jsonb", nullable: true, default: [] })
  bookmarks: number[];

  @Column({ default: 0 })
  share_count: number;

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: 0 })
  likes_count: number;

  @Column({ type: "jsonb", nullable: true, default: [] })
  likes: number[];

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
