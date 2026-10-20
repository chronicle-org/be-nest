// One-off: run the save-time HTML cleaning over posts written before it existed.
// Dry run by default; pass --apply to write. Usage: npm run posts:sanitize [-- --apply]
import { MoreThan } from "typeorm";
import dataSource from "../typeorm.config";
import { Post } from "../src/post/post.entity";
import { sanitizeRichText } from "../src/utils/sanitize-html";

const BATCH_SIZE = 100;
const FIELDS = ["title", "sub_title", "content"] as const;

async function main() {
  const apply = process.argv.includes("--apply");
  await dataSource.initialize();
  const repo = dataSource.getRepository(Post);

  let lastId = 0;
  let scanned = 0;
  let changed = 0;
  for (;;) {
    const posts = await repo.find({
      select: ["id", ...FIELDS],
      where: { id: MoreThan(lastId) },
      order: { id: "ASC" },
      take: BATCH_SIZE,
    });
    if (!posts.length) break;
    lastId = posts[posts.length - 1].id;
    scanned += posts.length;

    for (const post of posts) {
      const cleaned: Partial<Post> = {};
      for (const field of FIELDS) {
        const value = sanitizeRichText(post[field]);
        if (value !== post[field]) cleaned[field] = value;
      }
      if (!Object.keys(cleaned).length) continue;
      changed++;
      console.log(`post ${post.id}: ${Object.keys(cleaned).join(", ")}`);
      // update() leaves updated_at alone, so posts don't look freshly edited.
      if (apply) await repo.update({ id: post.id }, cleaned);
    }
  }

  console.log(
    `${scanned} posts scanned, ${changed} ${apply ? "cleaned" : "would change (dry run; pass --apply to write)"}`,
  );
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
