import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ staff: vi.fn(), scope: vi.fn() }));
vi.mock("@/lib/access/guards", () => ({ getCurrentStaffUser: mocks.staff }));
vi.mock("@/lib/db/tenant-scope", () => ({ withPlatformStaffScope: mocks.scope }));
import AuditPage from "./audit/page";
import OrganisationsPage from "./organisations/page";
import CasePage from "./support/[caseId]/page";
describe("staff read-only operational views", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.staff.mockResolvedValue(null); });
  it("denies audit reads before entering privileged database scope", async () => {
    await AuditPage({ searchParams: Promise.resolve({}) });
    expect(mocks.staff).toHaveBeenCalledWith("audit.read");
    expect(mocks.staff).toHaveBeenCalledWith("staff.grants.manage");
    expect(mocks.scope).not.toHaveBeenCalled();
  });
  it("denies organisation directory reads before database scope", async () => {
    await OrganisationsPage({ searchParams: Promise.resolve({}) });
    expect(mocks.staff).toHaveBeenCalledWith("tenants.read");
    expect(mocks.scope).not.toHaveBeenCalled();
  });
  it("denies staff conversations before rendering a privileged client", async () => {
    const page = await CasePage({ params: Promise.resolve({ caseId: "anything" }) });
    expect(mocks.staff).toHaveBeenCalledWith("support.cases.read");
    expect(page.type).toBe("main");
    expect(mocks.scope).not.toHaveBeenCalled();
  });
});
