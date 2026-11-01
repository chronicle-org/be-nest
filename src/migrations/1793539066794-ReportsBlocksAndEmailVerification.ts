import { MigrationInterface, QueryRunner } from "typeorm";

export class ReportsBlocksAndEmailVerification1793539066794
  implements MigrationInterface
{
  name = "ReportsBlocksAndEmailVerification1793539066794";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A report is about exactly one post or one comment.
    await queryRunner.query(
      `CREATE TABLE "report" ("id" SERIAL NOT NULL, "reporter_id" integer NOT NULL, "post_id" integer, "comment_id" integer, "reason" character varying(20) NOT NULL, "details" character varying(1000) NOT NULL DEFAULT '', "status" character varying(20) NOT NULL DEFAULT 'open', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "resolved_at" TIMESTAMP, CONSTRAINT "PK_99e4d0bea58cba73c57f935a546" PRIMARY KEY ("id"), CONSTRAINT "CHK_report_one_target" CHECK (("post_id" IS NULL) <> ("comment_id" IS NULL)))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8bb2bc4a3d9c55e031bc5d015c" ON "report" ("comment_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_265b3dc7c7f692f016115d46a2" ON "report" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc86d216c30504f7f4b9e32d32" ON "report" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_block" ("blocker_id" integer NOT NULL, "blocked_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_352a3b5c9a9508c57d63334c087" PRIMARY KEY ("blocker_id", "blocked_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed1ed3923f3dc0bbeecf44585a" ON "user_block" ("blocked_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "email_verified" boolean NOT NULL DEFAULT false`,
    );
    // Everyone who signed up before verification existed counts as verified.
    await queryRunner.query(`UPDATE "user" SET "email_verified" = true`);
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_d41df66b60944992386ed47cf2e" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_265b3dc7c7f692f016115d46a29" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_8bb2bc4a3d9c55e031bc5d015c5" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_block" ADD CONSTRAINT "FK_855f9a409b693d6e7cadfae8eba" FOREIGN KEY ("blocker_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_block" ADD CONSTRAINT "FK_ed1ed3923f3dc0bbeecf44585a4" FOREIGN KEY ("blocked_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_block" DROP CONSTRAINT "FK_ed1ed3923f3dc0bbeecf44585a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_block" DROP CONSTRAINT "FK_855f9a409b693d6e7cadfae8eba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_8bb2bc4a3d9c55e031bc5d015c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_265b3dc7c7f692f016115d46a29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_d41df66b60944992386ed47cf2e"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email_verified"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed1ed3923f3dc0bbeecf44585a"`,
    );
    await queryRunner.query(`DROP TABLE "user_block"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fc86d216c30504f7f4b9e32d32"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_265b3dc7c7f692f016115d46a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bb2bc4a3d9c55e031bc5d015c"`,
    );
    await queryRunner.query(`DROP TABLE "report"`);
  }
}
