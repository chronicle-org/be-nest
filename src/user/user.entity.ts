import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";

import { Post } from "../post/post.entity";
import { Comment } from "../comment/comment.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  email: string;

  @Column({ length: 255, select: false })
  password_hash: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  picture_url: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  banner_url: string;

  @Column({ type: "varchar", length: 255, unique: true })
  handle: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  profile_description: string;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];
}
