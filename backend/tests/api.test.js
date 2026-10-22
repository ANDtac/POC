import request from "supertest";
import { app } from "../src/app.js";
import { sequelize } from "../src/models/sequelize.js";
import { Run, Caught } from "../src/models/index.js";
import { validateGuide } from "../src/guides/catalog.js";

const password = "Password1";

const register = async (username) => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ username, email: `${username}@example.com`, password });
  expect(res.status).toBe(201);
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } };
};

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("Auth", () => {
  test("register validates input", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "ab", email: "x@y.z", password });
    expect(res.status).toBe(400);
  });

  test("duplicate registration returns 409", async () => {
    await register("dupe");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "dupe", email: "other@example.com", password });
    expect(res.status).toBe(409);
  });

  test("login gives the same error for unknown email and wrong password", async () => {
    await register("ash");
    const unknown = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password });
    const wrong = await request(app).post("/api/auth/login").send({ email: "ash@example.com", password: "Wrong1234" });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error).toBe(wrong.body.error);
  });

  test("login and verify round-trip", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: "ASH@example.com", password });
    expect(login.status).toBe(200);
    const verify = await request(app).get("/api/auth/verify").set("Authorization", `Bearer ${login.body.token}`);
    expect(verify.body.user.username).toBe("ash");
  });
});

describe("User privacy", () => {
  test("user list needs a token and never exposes emails", async () => {
    const { auth } = await register("misty");
    expect((await request(app).get("/api/user/all")).status).toBe(401);
    const res = await request(app).get("/api/user/all").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.every((u) => u.email === undefined)).toBe(true);
  });

  test("public user lookup has no email", async () => {
    const { user } = await register("brock");
    const res = await request(app).get(`/api/user/${user.id}`);
    expect(res.body).toEqual({ id: user.id, username: "brock" });
  });

  test("password change requires the current password", async () => {
    const { auth } = await register("gary");
    const denied = await request(app).patch("/api/user").set(auth).send({ password: "NewPass123" });
    expect(denied.status).toBe(403);
    const ok = await request(app).patch("/api/user").set(auth).send({ password: "NewPass123", current_password: password });
    expect(ok.status).toBe(200);
  });
});

describe("Games catalog", () => {
  test("lists games and returns a full guide", async () => {
    const list = await request(app).get("/api/games");
    expect(list.body.some((g) => g.id === "fixture")).toBe(true);
    const guide = await request(app).get("/api/games/fixture");
    expect(guide.body.sections[0].id).toBe("first");
    expect((await request(app).get("/api/games/nope")).status).toBe(404);
  });

  test("validateGuide rejects bad ids, bad choices and dangling requirements", () => {
    const base = { id: "g", name: "G", versions: [{ id: "g", name: "G" }] };
    const entry = { id: "bulbasaur", name: "Bulbasaur", method: "Gift" };
    const section = (extra) => ({ ...base, sections: [{ id: "s", label: "S", choices: [], entries: [entry], ...extra }] });
    expect(() => validateGuide(section({}))).not.toThrow();
    expect(() => validateGuide(section({ entries: [{ ...entry, id: "Bad Id" }] }))).toThrow();
    expect(() => validateGuide(section({ choices: [{ key: "k", cap: 0, options: [{ value: "x" }] }] }))).toThrow();
    expect(() => validateGuide(section({ entries: [{ ...entry, requires: [{ key: "starter", value: "x" }] }] }))).toThrow();
  });
});

describe("Runs", () => {
  let owner;
  let other;
  let runId;

  beforeAll(async () => {
    owner = await register("red");
    other = await register("blue");
  });

  test("create validates game and version", async () => {
    expect((await request(app).post("/api/runs").set(owner.auth).send({ game_id: "nope" })).status).toBe(400);
    expect((await request(app).post("/api/runs").set(owner.auth).send({ game_id: "fixture", version: "zzz" })).status).toBe(400);
    const res = await request(app).post("/api/runs").set(owner.auth).send({ game_id: "fixture" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Fixture Game");
    expect(res.body.version).toBe("fixture");
    // Starter rows are gated until a starter is chosen
    expect(res.body.progress).toEqual({ caught: 0, total: 5 });
    runId = res.body.id;
  });

  test("mark and unmark caught are idempotent", async () => {
    for (let i = 0; i < 2; i += 1) {
      expect((await request(app).put(`/api/runs/${runId}/caught/pikachu`).set(owner.auth)).status).toBe(200);
    }
    let run = await request(app).get(`/api/runs/${runId}`).set(owner.auth);
    expect(run.body.caught).toEqual(["pikachu"]);
    expect(run.body.progress.caught).toBe(1);

    for (let i = 0; i < 2; i += 1) {
      expect((await request(app).delete(`/api/runs/${runId}/caught/pikachu`).set(owner.auth)).status).toBe(200);
    }
    run = await request(app).get(`/api/runs/${runId}`).set(owner.auth);
    expect(run.body.caught).toEqual([]);
  });

  test("choices gate rows and respect caps", async () => {
    const pick = (key, values) => request(app).put(`/api/runs/${runId}/choices/${key}`).set(owner.auth).send({ values });
    let res = await pick("starter", ["charmander"]);
    expect(res.status).toBe(200);
    expect(res.body.choices).toEqual({ starter: ["charmander"] });
    // charmander row unlocked, spearow hidden by requiresNot
    expect(res.body.progress.total).toBe(5);

    res = await pick("starter", ["bulbasaur"]);
    expect(res.body.progress.total).toBe(6);

    expect((await pick("starter", ["bulbasaur", "charmander"])).status).toBe(400);
    expect((await pick("starter", ["squirtle"])).status).toBe(400);
    expect((await pick("nope", ["a"])).status).toBe(400);
    expect((await pick("stones", ["a", "c"])).status).toBe(200);
    expect((await pick("stones", ["a", "b", "c"])).status).toBe(400);

    res = await pick("stones", []);
    expect(res.body.choices).toEqual({ starter: ["bulbasaur"] });
  });

  test("rejects Pokemon that are not in the guide", async () => {
    const res = await request(app).put(`/api/runs/${runId}/caught/mewtwo`).set(owner.auth);
    expect(res.status).toBe(400);
  });

  test("bulk add and remove", async () => {
    const res = await request(app)
      .patch(`/api/runs/${runId}/caught`)
      .set(owner.auth)
      .send({ add: ["pidgey", "rattata", "pidgey"], remove: [] });
    expect(res.body.caught).toEqual(["pidgey", "rattata"]);
    const removed = await request(app).patch(`/api/runs/${runId}/caught`).set(owner.auth).send({ remove: ["pidgey"] });
    expect(removed.body.caught).toEqual(["rattata"]);
    const bad = await request(app).patch(`/api/runs/${runId}/caught`).set(owner.auth).send({ add: ["missingno"] });
    expect(bad.status).toBe(400);
  });

  test("advance section is bounded by the guide", async () => {
    expect((await request(app).patch(`/api/runs/${runId}`).set(owner.auth).send({ current_section: 1 })).body.current_section).toBe(1);
    expect((await request(app).patch(`/api/runs/${runId}`).set(owner.auth).send({ current_section: 99 })).status).toBe(400);
  });

  test("private runs are hidden from others; public runs are read-only", async () => {
    expect((await request(app).get(`/api/runs/${runId}`).set(other.auth)).status).toBe(404);
    expect((await request(app).get(`/api/runs/${runId}`)).status).toBe(404);

    await request(app).patch(`/api/runs/${runId}`).set(owner.auth).send({ is_public: true });
    const shared = await request(app).get(`/api/runs/${runId}`);
    expect(shared.status).toBe(200);
    expect(shared.body.is_owner).toBe(false);
    expect(shared.body.owner).toBe("red");

    expect((await request(app).put(`/api/runs/${runId}/caught/pidgey`).set(other.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/runs/${runId}`).set(other.auth).send({ title: "mine" })).status).toBe(404);
  });

  test("list shows only own runs", async () => {
    const mine = await request(app).get("/api/runs").set(owner.auth);
    const theirs = await request(app).get("/api/runs").set(other.auth);
    expect(mine.body.map((r) => r.id)).toEqual([runId]);
    expect(theirs.body).toEqual([]);
  });

  test("deleting the account cascades to runs and catches", async () => {
    expect((await request(app).delete("/api/user").set(owner.auth)).status).toBe(200);
    expect(await Run.count({ where: { id: runId } })).toBe(0);
    expect(await Caught.count({ where: { run_id: runId } })).toBe(0);
  });
});

describe("Errors", () => {
  test("malformed JSON returns 400", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
  });

  test("unknown API route returns JSON 404", async () => {
    const res = await request(app).get("/api/nothing");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});
