import { MigrationInterface, QueryRunner } from "typeorm";

export class RepliesAndInteractionTables1793259951606
  implements MigrationInterface
{
  name = "RepliesAndInteractionTables1793259951606";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post_like" ("user_id" integer NOT NULL, "post_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_155b6bea641466e2d27ade96a4b" PRIMARY KEY ("user_id", "post_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7ec6ac3dc7a05a9648c418f1a" ON "post_like" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "post_bookmark" ("user_id" integer NOT NULL, "post_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c09384fc668b98615e58a5ef709" PRIMARY KEY ("user_id", "post_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2681879c95487a275c3b9f3d3" ON "post_bookmark" ("post_id") `,
    );
    await queryRunner.query(`ALTER TABLE "comment" ADD "parent_id" integer`);
    await queryRunner.query(
      `CREATE INDEX "IDX_8bd8d0985c0d077c8129fb4a20" ON "comment" ("parent_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_8bd8d0985c0d077c8129fb4a209" FOREIGN KEY ("parent_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_like" ADD CONSTRAINT "FK_c635b15915984c8cdb520a1fef3" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_like" ADD CONSTRAINT "FK_a7ec6ac3dc7a05a9648c418f1ad" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" ADD CONSTRAINT "FK_88e074b2b61607ddd41baea64ae" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" ADD CONSTRAINT "FK_a2681879c95487a275c3b9f3d31" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // Copy existing likes and bookmarks out of the posts' jsonb arrays. Their
    // real dates aren't known, so use the post's date: lists ordered by
    // created_at then match the old newest-post-first order.
    for (const [table, column] of [
      ["post_like", "likes"],
      ["post_bookmark", "bookmarks"],
    ]) {
      await queryRunner.query(`INSERT INTO "${table}" ("user_id", "post_id", "created_at")
                SELECT DISTINCT (e)::int, p."id", p."created_at"
                FROM "post" p, jsonb_array_elements(COALESCE(p."${column}", '[]'::jsonb)) e
                WHERE jsonb_typeof(e) = 'number' AND EXISTS (SELECT 1 FROM "user" u WHERE u."id" = (e)::int)
                ON CONFLICT DO NOTHING`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" DROP CONSTRAINT "FK_a2681879c95487a275c3b9f3d31"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" DROP CONSTRAINT "FK_88e074b2b61607ddd41baea64ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_like" DROP CONSTRAINT "FK_a7ec6ac3dc7a05a9648c418f1ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_like" DROP CONSTRAINT "FK_c635b15915984c8cdb520a1fef3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_8bd8d0985c0d077c8129fb4a209"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bd8d0985c0d077c8129fb4a20"`,
    );
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "parent_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2681879c95487a275c3b9f3d3"`,
    );
    await queryRunner.query(`DROP TABLE "post_bookmark"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7ec6ac3dc7a05a9648c418f1a"`,
    );
    await queryRunner.query(`DROP TABLE "post_like"`);
  }
}
