import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1792079436743 implements MigrationInterface {
  name = "Baseline1792079436743";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Databases created by the old synchronize setup already have this
    // schema; record the baseline as applied without recreating it.
    if (await queryRunner.hasTable("user")) return;

    await queryRunner.query(
      `CREATE TABLE "comment" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "post_id" integer NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "post" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "title" character varying(255) NOT NULL DEFAULT '', "sub_title" character varying(255) NOT NULL DEFAULT '', "content" text NOT NULL DEFAULT '', "thumbnail_url" character varying(255) NOT NULL DEFAULT '', "comment_count" integer NOT NULL DEFAULT '0', "tags" character varying(255) NOT NULL DEFAULT '', "visibility" boolean NOT NULL DEFAULT true, "bookmarks_count" integer NOT NULL DEFAULT '0', "bookmarks" jsonb DEFAULT '[]', "share_count" integer NOT NULL DEFAULT '0', "view_count" integer NOT NULL DEFAULT '0', "likes_count" integer NOT NULL DEFAULT '0', "likes" jsonb DEFAULT '[]', "is_draft" boolean NOT NULL DEFAULT false, "reading_time" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "email" character varying(50) NOT NULL, "password_hash" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "picture_url" character varying(255), "banner_url" character varying(255), "handle" character varying(255) NOT NULL, "profile_description" character varying(255), "tags" character varying(100), "following" jsonb NOT NULL DEFAULT '[]', "following_count" integer NOT NULL DEFAULT '0', "followers" jsonb NOT NULL DEFAULT '[]', "followers_count" integer NOT NULL DEFAULT '0', "likes" jsonb NOT NULL DEFAULT '[]', "likes_count" integer NOT NULL DEFAULT '0', "bookmarks" jsonb NOT NULL DEFAULT '[]', "bookmarks_count" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_53197e5dba5dbaf94d29c8edbd3" UNIQUE ("handle"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification" ("id" SERIAL NOT NULL, "recipient_id" integer NOT NULL, "actor_id" integer NOT NULL, "type" smallint NOT NULL, "post_id" integer, "comment_id" integer, "message" text, "read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP, "deleted" boolean NOT NULL DEFAULT false, "deleted_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_settings" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "notify_comments" boolean NOT NULL DEFAULT true, "notify_likes" boolean NOT NULL DEFAULT true, "notify_follows" boolean NOT NULL DEFAULT true, "notify_bookmarks" boolean NOT NULL DEFAULT true, "notify_replies" boolean NOT NULL DEFAULT true, "notify_followed_posts_enabled" boolean NOT NULL DEFAULT true, "notify_followed_posts_from_users" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_91a7ffebe8b406c4470845d4781" UNIQUE ("user_id"), CONSTRAINT "REL_91a7ffebe8b406c4470845d478" UNIQUE ("user_id"), CONSTRAINT "PK_d131abd7996c475ef768d4559ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_bbfe153fa60aa06483ed35ff4a7" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_8aa21186314ce53c5b61a0e8c93" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_52378a74ae3724bcab44036645b" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_9830357f52360a126737d498e66" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_16addcdc44128a517daeddd4491" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_3ee113bf568b5efdc29cd95a360" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_8c115126cd4fdf58819e97a9716" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_settings" ADD CONSTRAINT "FK_91a7ffebe8b406c4470845d4781" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_settings" DROP CONSTRAINT "FK_91a7ffebe8b406c4470845d4781"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_8c115126cd4fdf58819e97a9716"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_3ee113bf568b5efdc29cd95a360"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_16addcdc44128a517daeddd4491"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_9830357f52360a126737d498e66"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_52378a74ae3724bcab44036645b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_8aa21186314ce53c5b61a0e8c93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_bbfe153fa60aa06483ed35ff4a7"`,
    );
    await queryRunner.query(`DROP TABLE "notification_settings"`);
    await queryRunner.query(`DROP TABLE "notification"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "post"`);
    await queryRunner.query(`DROP TABLE "comment"`);
  }
}
