import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
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

describe("Chronicle API (e2e)", () => {
  let app: INestApplication<App>;
  let ann: TestUser;
  let bob: TestUser;

  const api = () => request(app.getHttpServer());

  async function registerAndLogin(name: string): Promise<TestUser> {
    const email = `${name.toLowerCase()}-${runId}@example.com`;
    await api()
      .post("/auth/register")
      .send({ name, email, password })
      .expect(201);
    const res = await api()
      .post("/auth/login")
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
    app = moduleRef.createNestApplication();
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
  });
});
