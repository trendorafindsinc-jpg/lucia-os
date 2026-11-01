import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ memberships: vi.fn(), execute: vi.fn(), transaction: vi.fn(), put: vi.fn(), remove: vi.fn(), compress: vi.fn() }));
vi.mock("@/lib/access/guards", () => ({ getOrganizationMembershipsForUser: mocks.memberships }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ({ transaction: mocks.transaction, execute: mocks.execute }) }));
vi.mock("./image", () => ({ compressImage: mocks.compress }));
vi.mock("./storage", () => ({ storageConfigured: () => true, mediaStorage: () => ({ put: mocks.put, remove: mocks.remove }) }));
import { uploadMedia, removeMedia, validateMediaOwnership, findReadableMedia } from "./service";
const website = "a660ce01-079a-4409-a9e0-c5eb30c699b9", org = "f1e4dbf7-12b6-4285-8c4c-42cdb0b4e1fa", user = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("MEDIA_UPLOADS_ENABLED", "1");
  mocks.memberships.mockResolvedValue([{ id: org, role: "owner", membershipStatus: "active" }]);
  mocks.transaction.mockImplementation(async (callback) => callback({ execute: mocks.execute }));
  mocks.compress.mockResolvedValue({ data: Buffer.from("image"), bytes: 200, width: 5, height: 5 });
});
const member = [{ role: "owner", status: "active" }];
function uploadReservation(usage: number, quota: number, budgetUpdated = true) {
  // First authorization, then independently revalidated reservation transaction.
  mocks.execute.mockResolvedValueOnce([]).mockResolvedValueOnce(member).mockResolvedValueOnce([{ count: 0 }])
    .mockResolvedValueOnce([]).mockResolvedValueOnce(member).mockResolvedValueOnce([{ reserved_bytes: 0 }])
    .mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([{ used: usage }]).mockResolvedValueOnce([{ quota_bytes: quota }]);
  if (usage + 200 <= quota) mocks.execute.mockResolvedValueOnce(budgetUpdated ? [{ product: "lucia-os" }] : []).mockResolvedValueOnce([]);
}
describe("media authorization and capacity invariants", () => {
  it("denies absent and revoked membership before compression or object writes", async () => {
    mocks.memberships.mockResolvedValue([]);
    await expect(uploadMedia(user, website, Buffer.from("x"), "image/png", "Alt")).rejects.toMatchObject({ status: 404 });
    expect(mocks.compress).not.toHaveBeenCalled(); expect(mocks.put).not.toHaveBeenCalled();
  });
  it("does not decode another image after the upload rate cap", async () => {
    mocks.execute.mockResolvedValueOnce([]).mockResolvedValueOnce(member).mockResolvedValueOnce([{ count: 10 }]);
    await expect(uploadMedia(user, website, Buffer.from("x"), "image/png", "Alt")).rejects.toMatchObject({ status: 429 });
    expect(mocks.compress).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("rejects an exhausted website quota before any object is written", async () => {
    uploadReservation(900, 1000);
    await expect(uploadMedia(user, website, Buffer.from("x"), "image/png", "Alt")).rejects.toMatchObject({ status: 413 });
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("rejects an exhausted global product budget", async () => {
    uploadReservation(0, 1000, false);
    await expect(uploadMedia(user, website, Buffer.from("x"), "image/png", "Alt")).rejects.toMatchObject({ status: 507 });
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("retains a pending reservation after uncertain upload failure", async () => {
    uploadReservation(0, 1000); mocks.put.mockRejectedValue(Error("provider timeout"));
    await expect(uploadMedia(user, website, Buffer.from("x"), "image/png", "Alt")).rejects.toMatchObject({ status: 503 });
    expect(mocks.put).toHaveBeenCalledOnce(); expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
  it("does not claim upload success when readiness is not committed", async () => {
    uploadReservation(0, 1000);
    mocks.execute.mockResolvedValueOnce([]).mockResolvedValueOnce(member).mockResolvedValueOnce([]);
    await expect(uploadMedia(user, website, Buffer.from("x"), "image/png", "Alt")).rejects.toMatchObject({ status: 503 });
    expect(mocks.put).toHaveBeenCalledOnce();
  });
  it("returns a durable reference only after provider write and readiness confirmation", async () => {
    uploadReservation(0, 1000);
    mocks.execute.mockResolvedValueOnce([]).mockResolvedValueOnce(member).mockResolvedValueOnce([{ id: "confirmed" }]);
    const image = await uploadMedia(user, website, Buffer.from("x"), "image/png", "Alt");
    expect(image.ref).toMatch(/^media:[0-9a-f-]{36}$/);
    expect(image.bytes).toBe(200);
    expect(mocks.put).toHaveBeenCalledOnce();
  });
  it("rejects cross-website and missing media inside the caller's save transaction", async () => {
    mocks.execute.mockResolvedValue([]);
    await expect(validateMediaOwnership({ execute: mocks.execute } as never, org, website, { image: { src: "media:" + user } })).rejects.toThrow("another website");
  });
  it("returns canonical alt text for a valid article featured image", async () => {
    mocks.execute.mockResolvedValueOnce([{id:user,alt:"The shop interior"}]).mockResolvedValueOnce([]);
    const result=await validateMediaOwnership({execute:mocks.execute} as never,org,website,{featuredMediaRef:"media:"+user},true);
    expect(result[user]).toBe("The shop interior");
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
  it("never deletes an object referenced by a saved version", async () => {
    mocks.execute.mockResolvedValueOnce([]).mockResolvedValueOnce(member).mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: user, status: "ready", bytes: 200 }]).mockResolvedValueOnce([{ exists: 1 }]);
    await expect(removeMedia(user, website, user)).rejects.toMatchObject({ status: 409 });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not resolve private media for a revoked account", async () => {
    mocks.memberships.mockResolvedValue([]); mocks.execute.mockResolvedValue([]);
    expect(await findReadableMedia(user, user)).toBeNull();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
