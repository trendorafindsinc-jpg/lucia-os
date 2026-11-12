import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentStaffUser, withPlatformStaffScope } = vi.hoisted(() => ({
  getCurrentStaffUser: vi.fn(),
  withPlatformStaffScope: vi.fn(),
}));

vi.mock("@/lib/access/guards", () => ({ getCurrentStaffUser }));
vi.mock("@/lib/db/tenant-scope", () => ({ withPlatformStaffScope }));

import { GET, POST } from "./route";

describe("staff grant API authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentStaffUser.mockResolvedValue(null);
  });

  it("denies grant listing when no authorized staff user exists", async () => {
    const response = await GET();
    expect(response.status).toBe(403);
    expect(withPlatformStaffScope).not.toHaveBeenCalled();
  });

  it("denies grant mutations when no authorized staff user exists", async () => {
    const response = await POST(new Request("https://os.lucia.name.ng/api/staff/grants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "grant",
        userId: "e95a646b-84d2-4703-8faf-84106a67f423",
        role: "support_agent",
        reason: "Approved support assignment",
      }),
    }));
    expect(response.status).toBe(403);
    expect(withPlatformStaffScope).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before opening a database staff scope", async () => {
    getCurrentStaffUser.mockResolvedValue({ id: "e95a646b-84d2-4703-8faf-84106a67f423" });
    const response = await POST(new Request("https://os.lucia.name.ng/api/staff/grants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }));
    expect(response.status).toBe(400);
    expect(withPlatformStaffScope).not.toHaveBeenCalled();
  });

  it("rejects unsupported roles and missing audit reasons", async () => {
    getCurrentStaffUser.mockResolvedValue({ id: "e95a646b-84d2-4703-8faf-84106a67f423" });
    const response = await POST(new Request("https://os.lucia.name.ng/api/staff/grants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "grant",
        userId: "e95a646b-84d2-4703-8faf-84106a67f423",
        role: "platform_operator",
        reason: "",
      }),
    }));
    expect(response.status).toBe(400);
    expect(withPlatformStaffScope).not.toHaveBeenCalled();
  });
});
