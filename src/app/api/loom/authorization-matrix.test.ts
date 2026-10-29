import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getDb: vi.fn(),
  restriction: vi.fn(),
  rateLimit: vi.fn(),
  requireStaff: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/loom/staff", () => ({
  getLoomRestriction: mocks.restriction,
  requireLoomStaff: mocks.requireStaff,
}));
vi.mock("@/lib/loom/rate-limit", () => ({ consumeLoomRateLimit: mocks.rateLimit }));

import { POST as createGroup } from "./groups/route";
import { POST as joinGroup, DELETE as leaveGroup } from "./groups/[groupId]/membership/route";
import { POST as createGroupPost, GET as listGroupPosts } from "./groups/[groupId]/posts/route";
import { GET as discoverMembers } from "./members/route";
import { GET as readMember } from "./members/[userId]/route";
import { GET as listNotifications, PATCH as updateNotifications } from "./notifications/route";
import { GET as listReplies, POST as createReply } from "./posts/[postId]/replies/route";
import { GET as readProfile, PUT as updateProfile } from "./profile/route";
import { GET as readReactions, POST as updateReaction } from "./reactions/route";
import { POST as createReport } from "./reports/route";
import { GET as listSaved, POST as savePost, DELETE as unsavePost } from "./saved/route";
import { GET as listVerification, PATCH as reviewVerification } from "./staff/verification/route";

const memberId = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
const groupId = "9f01ed80-9900-4ed7-bf38-7df0b531eaf4";
const postId = "48a711c8-70b4-4c2b-a9d0-9e6e8b1b7c7e";

function request(path: string, method: string, body?: unknown, origin = "https://loom.example.test") {
  return new Request("https://loom.example.test" + path, {
    method,
    headers: {
      origin,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const groupContext = { params: Promise.resolve({ groupId }) };
const postContext = { params: Promise.resolve({ postId }) };

describe("Loom route-level authorization matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(null);
    mocks.getDb.mockImplementation(() => { throw new Error("Database should not be reached by denied requests"); });
    mocks.restriction.mockResolvedValue(null);
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.requireStaff.mockResolvedValue({ user: null, denied: "unauthenticated" });
  });

  it("denies anonymous member discovery and private profile, notification, saved-content routes", async () => {
    expect((await discoverMembers(request("/api/loom/members", "GET"))).status).toBe(401);
    expect((await readProfile()).status).toBe(401);
    expect((await listNotifications()).status).toBe(401);
    expect((await listSaved()).status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("denies anonymous group creation and membership changes", async () => {
    expect((await createGroup(request("/api/loom/groups", "POST", { name: "Test group", slug: "test-group" }))).status).toBe(401);
    expect((await joinGroup(request("/api/loom/groups/" + groupId + "/membership", "POST"), groupContext))?.status).toBe(401);
    expect((await leaveGroup(request("/api/loom/groups/" + groupId + "/membership", "DELETE"), groupContext))?.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("denies anonymous group posts, replies, reactions, reports and saved-post mutations", async () => {
    expect((await createGroupPost(request("/api/loom/groups/" + groupId + "/posts", "POST", { body: "test" }), groupContext)).status).toBe(401);
    expect((await createReply(request("/api/loom/posts/" + postId + "/replies", "POST", { body: "test" }), postContext)).status).toBe(401);
    expect((await updateReaction(request("/api/loom/reactions", "POST", { postId, reaction: "like" }))).status).toBe(401);
    expect((await createReport(request("/api/loom/reports", "POST", { targetType: "post", targetId: postId, reason: "spam" }))).status).toBe(401);
    expect((await savePost(request("/api/loom/saved", "POST", { postId }))).status).toBe(401);
    expect((await unsavePost(request("/api/loom/saved", "DELETE", { postId }))).status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("denies anonymous notification/profile mutations and staff verification access", async () => {
    expect((await updateNotifications(request("/api/loom/notifications", "PATCH", { markAllRead: true }))).status).toBe(401);
    expect((await updateProfile(request("/api/loom/profile", "PUT", { businessName: "Test" }))).status).toBe(401);
    expect((await reviewVerification(request("/api/loom/staff/verification", "PATCH", {
      verificationId: postId, decision: "verified",
    }))).status).toBe(401);
    expect((await listVerification()).status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects cross-origin writes before authentication or database access", async () => {
    const attacker = "https://attacker.example";
    const results = await Promise.all([
      createGroup(request("/api/loom/groups", "POST", { name: "Test group", slug: "test-group" }, attacker)),
      joinGroup(request("/api/loom/groups/" + groupId + "/membership", "POST", undefined, attacker), groupContext),
      createGroupPost(request("/api/loom/groups/" + groupId + "/posts", "POST", { body: "test" }, attacker), groupContext),
      createReply(request("/api/loom/posts/" + postId + "/replies", "POST", { body: "test" }, attacker), postContext),
      updateProfile(request("/api/loom/profile", "PUT", { businessName: "Test" }, attacker)),
      updateReaction(request("/api/loom/reactions", "POST", { postId, reaction: "like" }, attacker)),
      createReport(request("/api/loom/reports", "POST", { targetType: "post", targetId: postId, reason: "spam" }, attacker)),
      savePost(request("/api/loom/saved", "POST", { postId }, attacker)),
      unsavePost(request("/api/loom/saved", "DELETE", { postId }, attacker)),
      updateNotifications(request("/api/loom/notifications", "PATCH", { markAllRead: true }, attacker)),
      reviewVerification(request("/api/loom/staff/verification", "PATCH", { verificationId: postId, decision: "verified" }, attacker)),
    ]);
    expect(results.map(response => response?.status)).toEqual(Array(11).fill(403));
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed public resource identifiers before database access", async () => {
    expect((await listGroupPosts(request("/api/loom/groups/not-a-uuid/posts", "GET"), { params: Promise.resolve({ groupId: "not-a-uuid" }) })).status).toBe(400);
    expect((await readMember(request("/api/loom/members/not-a-uuid", "GET"), { params: Promise.resolve({ userId: "not-a-uuid" }) })).status).toBe(400);
    expect((await listReplies(request("/api/loom/posts/not-a-uuid/replies", "GET"), { params: Promise.resolve({ postId: "not-a-uuid" }) })).status).toBe(400);
    expect((await readReactions(request("/api/loom/reactions", "GET"))).status).toBe(400);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
