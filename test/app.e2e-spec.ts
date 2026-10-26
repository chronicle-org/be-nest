import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import type { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/setup-app";

// Runs against the database in DATABASE_URL (CI starts a throwaway
// Postgres). Emails are unique per run so the suite can be re-run.
const runId = Date.now();
const password = "secret123";

type TestUser = { id: number; email: string; cookie: string };

// Every response is wrapped by ResponseInterceptor (errors keep Nest's shape).
type ApiBody = {
  content: { id: number } & Record<string, unknown>;
  message: string;
};
const bodyOf = (res: { body: unknown }) => res.body as ApiBody;
const pageOf = (res: { body: unknown }) =>
  (res.body as { content: { data: { id: number }[]; total: number } }).content;

describe("Chronicle API (e2e)", () => {
  let app: INestApplication<App>;
  let ann: TestUser;
  let bob: TestUser;

  const api = () => request(app.getHttpServer());

  // Each user signs up from its own address, so making many test users
  // doesn't hit the per-address sign-up and login rate limits.
  let userCount = 0;
  async function registerAndLogin(name: string): Promise<TestUser> {
    const email = `${name.toLowerCase()}-${runId}@example.com`;
    const ip = `10.0.0.${++userCount}`;
    await api()
      .post("/auth/register")
      .set("X-Forwarded-For", ip)
      .send({ name, email, password })
      .expect(201);
    const res = await api()
      .post("/auth/login")
      .set("X-Forwarded-For", ip)
      .send({ email, password })
      .expect(201);
    const setCookie = res.headers["set-cookie"] as unknown as string[];
    return {
      id: bodyOf(res).content.id,
      email,
      cookie: setCookie.map((c) => c.split(";")[0]).join("; "),
    };
  }

  async function createPost(
    user: TestUser,
    body: Record<string, unknown> = {},
  ): Promise<number> {
    const res = await api()
      .post("/post")
      .set("Cookie", user.cookie)
      .send({ title: "Hello", content: "<p>Hi there</p>", ...body })
      .expect(201);
    return bodyOf(res).content.id;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    // Read the client address from X-Forwarded-For, as behind Cloud Run.
    (app as unknown as NestExpressApplication).set("trust proxy", true);
    configureApp(app);
    await app.init();

    ann = await registerAndLogin("Ann");
    bob = await registerAndLogin("Bob");
  });

  afterAll(async () => {
    // Let fire-and-forget notification writes finish before closing the pool.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await app.close();
  });

  describe("auth", () => {
    it("rejects a duplicate email", () =>
      api()
        .post("/auth/register")
        .send({ name: "Ann", email: ann.email, password })
        .expect(409));

    it("rejects sign up when SIGNUP_ENABLED is false", async () => {
      process.env.SIGNUP_ENABLED = "false";
      try {
        await api()
          .post("/auth/register")
          .send({ name: "Cy", email: `cy-${runId}@example.com`, password })
          .expect(403);
      } finally {
        delete process.env.SIGNUP_ENABLED;
      }
    });

    it("gives the same 401 for a wrong password and an unknown email", async () => {
      const wrong = await api()
        .post("/auth/login")
        .send({ email: ann.email, password: "wrong-password" })
        .expect(401);
      const unknown = await api()
        .post("/auth/login")
        .send({ email: `nobody-${runId}@example.com`, password })
        .expect(401);
      expect(bodyOf(wrong).message).toBe(bodyOf(unknown).message);
    });

    it("never returns the password hash on login", async () => {
      const res = await api()
        .post("/auth/login")
        .send({ email: ann.email, password })
        .expect(201);
      expect(bodyOf(res).content.password_hash).toBeUndefined();
    });

    it("requires a login to create a post", () =>
      api().post("/post").send({ title: "Nope" }).expect(401));
  });

  describe("posts", () => {
    it("saves tags", async () => {
      const id = await createPost(ann, { tags: "nestjs,testing" });
      const res = await api().get(`/post/${id}`).expect(200);
      expect(bodyOf(res).content.tags).toBe("nestjs,testing");
    });

    it("strips scripts and unknown iframes from post HTML", async () => {
      const id = await createPost(ann, {
        content:
          '<p>Hi<img src="x" onerror="alert(1)"></p><script>alert(1)</script>' +
          '<iframe src="https://evil.example"></iframe>',
      });
      const res = await api().get(`/post/${id}`).expect(200);
      expect(bodyOf(res).content.content).toBe('<p>Hi<img src="x" /></p>');
    });

    it("hides drafts from everyone but the author", async () => {
      const id = await createPost(ann, { is_draft: true });
      await api().get(`/post/${id}`).expect(404);
      await api().get(`/post/${id}`).set("Cookie", bob.cookie).expect(404);
      await api().get(`/post/${id}`).set("Cookie", ann.cookie).expect(200);
    });

    it("returns 403 when editing or deleting someone else's post", async () => {
      const id = await createPost(ann);
      await api()
        .put(`/post/${id}`)
        .set("Cookie", bob.cookie)
        .send({ title: "Mine now" })
        .expect(403);
      await api().delete(`/post/${id}`).set("Cookie", bob.cookie).expect(403);
    });

    it("deletes a post that has comments", async () => {
      const id = await createPost(ann);
      await api()
        .post("/comment")
        .set("Cookie", bob.cookie)
        .send({ post_id: id, content: "Nice post" })
        .expect(201);
      await api().delete(`/post/${id}`).set("Cookie", ann.cookie).expect(200);
      await api().get(`/post/${id}`).expect(404);
    });
  });

  describe("likes", () => {
    it("counts each user once, even with concurrent requests", async () => {
      const id = await createPost(ann);
      const likes = await Promise.all(
        Array.from({ length: 5 }, () =>
          api().put(`/post/interaction/like/${id}`).set("Cookie", bob.cookie),
        ),
      );
      expect(likes.filter((r) => r.status === 200)).toHaveLength(1);

      const res = await api().get(`/post/${id}`).expect(200);
      expect(bodyOf(res).content.likes_count).toBe(1);
      expect(bodyOf(res).content.likes).toEqual([bob.id]);
    });

    it("unlikes and refuses to go below zero", async () => {
      const id = await createPost(ann);
      await api()
        .put(`/post/interaction/like/${id}`)
        .set("Cookie", bob.cookie)
        .expect(200);
      await api()
        .put(`/post/interaction/unlike/${id}`)
        .set("Cookie", bob.cookie)
        .expect(200);
      await api()
        .put(`/post/interaction/unlike/${id}`)
        .set("Cookie", bob.cookie)
        .expect(400);

      const res = await api().get(`/post/${id}`).expect(200);
      expect(bodyOf(res).content.likes_count).toBe(0);
    });
  });

  describe("follows", () => {
    it("follows and unfollows, keeping both counts in sync", async () => {
      await api()
        .post(`/user/follow/${ann.id}`)
        .set("Cookie", bob.cookie)
        .expect(201);
      await api()
        .post(`/user/follow/${ann.id}`)
        .set("Cookie", bob.cookie)
        .expect(400);

      const getUser = (user: TestUser) =>
        api().get(`/user/${user.id}`).set("Cookie", ann.cookie).expect(200);

      let annRes = await getUser(ann);
      let bobRes = await getUser(bob);
      expect(bodyOf(annRes).content.followers_count).toBe(1);
      expect(bodyOf(bobRes).content.following_count).toBe(1);

      await api()
        .post(`/user/unfollow/${ann.id}`)
        .set("Cookie", bob.cookie)
        .expect(201);
      annRes = await getUser(ann);
      bobRes = await getUser(bob);
      expect(bodyOf(annRes).content.followers_count).toBe(0);
      expect(bodyOf(bobRes).content.following_count).toBe(0);
    });

    it("refuses to follow yourself", () =>
      api()
        .post(`/user/follow/${ann.id}`)
        .set("Cookie", ann.cookie)
        .expect(400));

    it("pages followers", async () => {
      const cy = await registerAndLogin("Cy");
      for (const follower of [bob, cy])
        await api()
          .post(`/user/follow/${ann.id}`)
          .set("Cookie", follower.cookie)
          .expect(201);

      const first = pageOf(
        await api().get(`/user/followers/${ann.id}?limit=1`).expect(200),
      );
      const second = pageOf(
        await api().get(`/user/followers/${ann.id}?limit=1&page=2`).expect(200),
      );
      expect(first.total).toBe(2);
      expect([first.data[0].id, second.data[0].id].sort()).toEqual(
        [bob.id, cy.id].sort(),
      );

      await api().get(`/user/followers/${ann.id}?limit=51`).expect(400);
    });
  });

  describe("profiles", () => {
    it("shows profiles to anyone but the email only to logged-in viewers", async () => {
      const anon = await api().get(`/user/${ann.id}`).expect(200);
      expect(bodyOf(anon).content.id).toBe(ann.id);
      expect(bodyOf(anon).content.email).toBeUndefined();

      const loggedIn = await api()
        .get(`/user/${ann.id}`)
        .set("Cookie", bob.cookie)
        .expect(200);
      expect(bodyOf(loggedIn).content.email).toBe(ann.email);
    });
  });

  describe("comments", () => {
    it("pages comments on a post, newest first", async () => {
      const postId = await createPost(ann);
      for (const content of ["first", "second", "third"])
        await api()
          .post("/comment")
          .set("Cookie", bob.cookie)
          .send({ post_id: postId, content })
          .expect(201);

      const res = await api()
        .get(`/comment/post/${postId}?limit=2`)
        .expect(200);
      const page = pageOf(res) as unknown as {
        data: { content: string }[];
        total: number;
      };
      expect(page.total).toBe(3);
      expect(page.data.map((c) => c.content)).toEqual(["third", "second"]);
    });
  });

  describe("change password", () => {
    it("changes the password after checking the current one", async () => {
      const dee = await registerAndLogin("Dee");
      const change = (current_password: string, new_password: string) =>
        api()
          .put("/auth/password")
          .set("Cookie", dee.cookie)
          .send({ current_password, new_password });

      await change("wrong-password", "newSecret456").expect(400);
      await change(password, password).expect(400);
      await change(password, "newSecret456").expect(200);

      await api()
        .post("/auth/login")
        .send({ email: dee.email, password })
        .expect(401);
      await api()
        .post("/auth/login")
        .send({ email: dee.email, password: "newSecret456" })
        .expect(201);
    });

    it("logs out older sessions but keeps this one logged in", async () => {
      const eve = await registerAndLogin("Eve");
      const drafts = (cookie: string) =>
        api().get(`/post/user/${eve.id}/drafts`).set("Cookie", cookie);
      await drafts(eve.cookie).expect(200);

      const res = await api()
        .put("/auth/password")
        .set("Cookie", eve.cookie)
        .send({ current_password: password, new_password: "newSecret456" })
        .expect(200);
      const setCookie = res.headers["set-cookie"] as unknown as string[];
      const newCookie = setCookie.map((c) => c.split(";")[0]).join("; ");

      await drafts(eve.cookie).expect(401);
      await drafts(newCookie).expect(200);
    });

    it("requires a login", () =>
      api()
        .put("/auth/password")
        .send({ current_password: password, new_password: "newSecret456" })
        .expect(401));
  });

  describe("follow suggestions", () => {
    it("suggests people your follows follow, never yourself or people you follow", async () => {
      const [fay, gus, hal, ivy] = await Promise.all(
        ["Fay", "Gus", "Hal", "Ivy"].map((name) => registerAndLogin(name)),
      );
      const follow = (who: TestUser, whom: TestUser) =>
        api()
          .post(`/user/follow/${whom.id}`)
          .set("Cookie", who.cookie)
          .expect(201);
      // Fay follows Gus and Hal; both follow Ivy, and Gus follows Hal.
      await follow(fay, gus);
      await follow(fay, hal);
      await follow(gus, ivy);
      await follow(hal, ivy);
      await follow(gus, hal);
      await follow(ivy, fay);

      const res = await api()
        .get("/user/suggestions?limit=5")
        .set("Cookie", fay.cookie)
        .expect(200);
      const ids = (res.body as { content: { id: number }[] }).content.map(
        (u) => u.id,
      );
      expect(ids[0]).toBe(ivy.id);
      expect(ids).toHaveLength(5);
      expect(ids).not.toContain(fay.id);
      expect(ids).not.toContain(gus.id);
      expect(ids).not.toContain(hal.id);

      // Anyone can get suggestions; they're the most-followed users.
      const anon = await api().get("/user/suggestions?limit=2").expect(200);
      expect((anon.body as { content: unknown[] }).content).toHaveLength(2);
    });
  });

  describe("delete account", () => {
    it("needs the password, then removes the user everywhere", async () => {
      const kim = await registerAndLogin("Kim");
      const lee = await registerAndLogin("Lee");
      const kimPost = await createPost(kim);
      const leePost = await createPost(lee);

      await api()
        .post(`/user/follow/${lee.id}`)
        .set("Cookie", kim.cookie)
        .expect(201);
      await api()
        .post(`/user/follow/${kim.id}`)
        .set("Cookie", lee.cookie)
        .expect(201);
      await api()
        .put(`/post/interaction/like/${leePost}`)
        .set("Cookie", kim.cookie)
        .expect(200);
      await api()
        .put(`/post/interaction/bookmark/${kimPost}`)
        .set("Cookie", lee.cookie)
        .expect(200);
      await api()
        .post("/comment")
        .set("Cookie", kim.cookie)
        .send({ post_id: leePost, content: "nice" })
        .expect(201);
      await api()
        .post("/comment")
        .set("Cookie", lee.cookie)
        .send({ post_id: kimPost, content: "hi" })
        .expect(201);

      await api()
        .delete("/auth/account")
        .set("Cookie", kim.cookie)
        .send({ password: "wrong-password" })
        .expect(400);
      await api()
        .delete("/auth/account")
        .set("Cookie", kim.cookie)
        .send({ password })
        .expect(200);

      await api().get(`/user/${kim.id}`).expect(404);
      await api().get(`/post/${kimPost}`).expect(404);
      await api()
        .post("/auth/login")
        .send({ email: kim.email, password })
        .expect(401);
      await api()
        .get(`/post/user/${kim.id}/drafts`)
        .set("Cookie", kim.cookie)
        .expect(401);

      const leeUser = bodyOf(
        await api().get(`/user/${lee.id}`).set("Cookie", lee.cookie),
      ).content;
      expect(leeUser.followers).toEqual([]);
      expect(leeUser.followers_count).toBe(0);
      expect(leeUser.following).toEqual([]);
      expect(leeUser.following_count).toBe(0);
      expect(leeUser.bookmarks).toEqual([]);
      expect(leeUser.bookmarks_count).toBe(0);

      const leePostBody = bodyOf(await api().get(`/post/${leePost}`)).content;
      expect(leePostBody.likes).toEqual([]);
      expect(leePostBody.likes_count).toBe(0);
      expect(leePostBody.comment_count).toBe(0);
    });

    it("requires a login", () =>
      api().delete("/auth/account").send({ password }).expect(401));
  });

  describe("uploads", () => {
    it("rejects a file whose content isn't the image type it claims", async () => {
      const res = await api()
        .post("/file?type=1")
        .set("Cookie", ann.cookie)
        .attach("file", Buffer.from("<html><script>alert(1)</script>"), {
          filename: "cat.png",
          contentType: "image/png",
        })
        .expect(400);
      expect(bodyOf(res).message).toBe(
        "File content doesn't match its image type",
      );
    });
  });

  describe("health", () => {
    it("reports ok with security headers", async () => {
      const res = await api().get("/health").expect(200);
      expect(bodyOf(res).content).toEqual({ status: "ok" });
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
  });
});
