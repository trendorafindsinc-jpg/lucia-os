import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), members: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/access/guards", () => ({
  getOrganizationMembershipsForUser: mocks.members,
}));
vi.mock("./control-center", () => ({
  default: ({ organizations }: { organizations: unknown[] }) => (
    <div>Control Center · {organizations.length} organizations</div>
  ),
}));
import SettingsPage from "./page";
describe("Settings server boundary", () => {
  it("denies signed-out access and preserves safe login destination", async () => {
    mocks.user.mockResolvedValue(null);
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain("Sign in to open Settings");
    expect(html).toContain("returnTo=%2Fworkspace%2Fsettings");
  });
  it.each([0, 1, 2])(
    "renders %i memberships from session lookup",
    async (count) => {
      mocks.user.mockResolvedValue({ id: "user-a" });
      mocks.members.mockResolvedValue(
        Array.from({ length: count }, (_, i) => ({
          id: `org-${i}`,
          name: `Org ${i}`,
          role: "member",
        })),
      );
      const html = renderToStaticMarkup(await SettingsPage());
      expect(html).toContain(`${count} organizations`);
      expect(mocks.members).toHaveBeenCalledWith("user-a");
    },
  );
});
