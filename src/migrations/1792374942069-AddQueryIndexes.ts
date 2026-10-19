import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQueryIndexes1792374942069 implements MigrationInterface {
  name = "AddQueryIndexes1792374942069";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_bbfe153fa60aa06483ed35ff4a" ON "comment" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8aa21186314ce53c5b61a0e8c9" ON "comment" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d65f5e996866201d320f93852" ON "post" ("user_id", "is_draft") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c115126cd4fdf58819e97a971" ON "notification" ("comment_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ee113bf568b5efdc29cd95a36" ON "notification" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d34aa77b1cb788d36b3f750794" ON "notification" ("recipient_id", "created_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d34aa77b1cb788d36b3f750794"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ee113bf568b5efdc29cd95a36"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c115126cd4fdf58819e97a971"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d65f5e996866201d320f93852"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8aa21186314ce53c5b61a0e8c9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bbfe153fa60aa06483ed35ff4a"`,
    );
  }
}
