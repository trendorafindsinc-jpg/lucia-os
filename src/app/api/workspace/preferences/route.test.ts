import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/workspace/preference-store", () => ({
  readPreferences: mocks.read,
  savePreferences: mocks.save,
}));
import { GET, PUT } from "./route";
import { DEFAULT_PREFERENCES } from "@/lib/workspace/preferences";
const request = (body: unknown, origin = "https://os.example") =>
  new Request("https://os.example/api/workspace/preferences", {
    method: "PUT",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "verified-user" });
  mocks.read.mockResolvedValue({
    preferences: DEFAULT_PREFERENCES,
    revision: 0,
  });
  mocks.save.mockResolvedValue({
    preferences: DEFAULT_PREFERENCES,
    revision: 1,
  });
});
describe("authenticated settings API", () => {
  it("denies signed-out reads and writes without database access", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PUT(request({}))).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("reads only verified session owner and disables caching", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith("verified-user");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
  it("cannot select another account via payload", async () => {
    expect(
      (
        await PUT(
          request({
            userId: "victim",
            preferences: { ...DEFAULT_PREFERENCES, userId: "victim" },
            revision: 0,
          }),
        )
      ).status,
    ).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(
      "verified-user",
      DEFAULT_PREFERENCES,
      0,
    );
  });
  it("denies cross-origin and missing origins", async () => {
    expect((await PUT(request({}, "https://evil.example"))).status).toBe(403);
    expect((await PUT(request({}, ""))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([
    { preferences: { homeApps: ["staff"] }, revision: 0 },
    { preferences: { wallpaper: "<svg>" }, revision: 0 },
    { preferences: {}, revision: -1 },
  ])("rejects invalid payload %j", async (p) =>
    expect((await PUT(request(p))).status).toBe(400),
  );
  it("bounds payload size", async () =>
    expect((await PUT(request({ x: "a".repeat(9000) }))).status).toBe(413));
  it("rejects malformed JSON", async () =>
    expect(
      (
        await PUT(
          new Request("https://os.example/api/workspace/preferences", {
            method: "PUT",
            headers: {
              origin: "https://os.example",
              "content-type": "application/json",
            },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400));
  it("returns membership denial", async () => {
    mocks.save.mockResolvedValue({ error: "Denied", status: 403 });
    expect(
      (await PUT(request({ preferences: DEFAULT_PREFERENCES, revision: 0 })))
        .status,
    ).toBe(403);
  });
  it("reports stale update conflict", async () => {
    mocks.save.mockResolvedValue({ error: "Stale", status: 409 });
    expect(
      (await PUT(request({ preferences: DEFAULT_PREFERENCES, revision: 0 })))
        .status,
    ).toBe(409);
  });
  it("reports failure honestly then allows retry", async () => {
    mocks.save.mockRejectedValueOnce(Error("offline"));
    const body = { preferences: DEFAULT_PREFERENCES, revision: 0 };
    expect((await PUT(request(body))).status).toBe(503);
    expect((await PUT(request(body))).status).toBe(200);
  });
  it("handles load failure without inventing saved preferences", async () => {
    mocks.read.mockRejectedValue(Error("db"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).not.toHaveProperty("preferences");
  });
});
