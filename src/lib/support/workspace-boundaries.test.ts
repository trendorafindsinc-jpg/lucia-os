import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), access: vi.fn(), staff: vi.fn(), tenantCase: vi.fn(), staffCase: vi.fn(), tenantScope: vi.fn(), staffScope: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/access/guards", () => ({ getCurrentOrganizationAccess: mocks.access, getCurrentStaffUser: mocks.staff }));
vi.mock("@/lib/support/authorized-case", () => ({ findSupportCaseForUser: mocks.tenantCase, findSupportCaseForStaff: mocks.staffCase }));
vi.mock("@/lib/db/tenant-scope", () => ({ withOrganizationScope: mocks.tenantScope, withPlatformStaffScope: mocks.staffScope }));
import { GET as customerCase } from "@/app/api/support/cases/[caseId]/route";
import { GET as staffCase, PATCH } from "@/app/api/staff/support/cases/[caseId]/route";
import { GET as customerMessages, POST as customerReply } from "@/app/api/support/cases/[caseId]/messages/route";
import { GET as staffMessages, POST as staffReply } from "@/app/api/staff/support/cases/[caseId]/messages/route";
const id = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
const context = { params: Promise.resolve({ caseId: id }) };
const record = { id, organizationId: "f1e4dbf7-12b6-4285-8c4c-42cdb0b4e1fa", status: "open" };
const request = (body?: unknown) => new Request("https://os.lucia.name.ng/api/support/cases/" + id + "/messages?visibility=internal", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
function txMock() {
  const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "message" }]) });
  const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  return { tx: { insert: vi.fn().mockReturnValue({ values }), update: vi.fn().mockReturnValue({ set }) }, values, set };
}
describe("explicit staff/customer support boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id });
    mocks.staff.mockResolvedValue({ id });
    mocks.tenantCase.mockResolvedValue(null);
    mocks.staffCase.mockResolvedValue(record);
    mocks.access.mockResolvedValue({ membership: { organizationId: record.organizationId } });
  });
  it("customer case and messages never fall back to staff powers", async () => {
    expect((await customerCase(request(), context)).status).toBe(404);
    expect((await customerMessages(request(), context)).status).toBe(404);
    expect(mocks.staffCase).not.toHaveBeenCalled();
    expect(mocks.staffScope).not.toHaveBeenCalled();
  });
  it("customer reply cannot use staff powers or another tenant's case", async () => {
    expect((await customerReply(request({ body: "hello" }), context)).status).toBe(403);
    expect(mocks.staff).not.toHaveBeenCalled();
    expect(mocks.staffScope).not.toHaveBeenCalled();
  });
  it("dual-role users reply as customers and cannot add internal notes on customer endpoint", async () => {
    mocks.tenantCase.mockResolvedValue(record);
    const { tx, values, set } = txMock();
    mocks.tenantScope.mockImplementation((_id, fn) => fn(tx));
    expect((await customerReply(request({ body: "hello" }), context)).status).toBe(201);
    expect(values.mock.calls[0][0]).toMatchObject({ authorKind: "tenant", visibility: "customer", organizationId: record.organizationId });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "waiting_on_staff" }));
    expect(mocks.staff).not.toHaveBeenCalled();
  });
  it("internal staff notes do not move the case to waiting on customer", async () => {
    const { tx, values, set } = txMock();
    mocks.staffScope.mockImplementation((_id, fn) => fn(tx));
    expect((await staffReply(request({ body: "private triage" }), context)).status).toBe(201);
    expect(values.mock.calls[0][0]).toMatchObject({ authorKind: "staff", visibility: "internal" });
    expect(set.mock.calls[0][0]).not.toHaveProperty("status");
    expect(mocks.tenantCase).not.toHaveBeenCalled();
  });
  it("staff reads do not silently fall back to tenant membership", async () => {
    mocks.staffCase.mockResolvedValue(null);
    mocks.tenantCase.mockResolvedValue(record);
    expect((await staffCase(request(), context)).status).toBe(404);
    expect((await staffMessages(request(), context)).status).toBe(404);
    expect(mocks.tenantCase).not.toHaveBeenCalled();
  });
  it("closed cases refuse staff replies before a write", async () => {
    mocks.staffCase.mockResolvedValue({ ...record, status: "resolved" });
    expect((await staffReply(request({ body: "hello" }), context)).status).toBe(409);
    expect(mocks.staffScope).not.toHaveBeenCalled();
  });
  it("status changes require resolve permission", async () => {
    mocks.staff.mockResolvedValue(null);
    expect((await PATCH(request({ action: "status", status: "resolved" }), context)).status).toBe(403);
    expect(mocks.staff).toHaveBeenCalledWith("support.cases.resolve");
    expect(mocks.staffScope).not.toHaveBeenCalled();
  });
  it("self assignment checks the distinct self-assignment permission", async () => {
    mocks.staff.mockResolvedValue(null);
    expect((await PATCH(request({ action: "claim" }), context)).status).toBe(403);
    expect(mocks.staff).toHaveBeenCalledWith("support.cases.assign_self");
  });
  it("anonymous staff case access fails before case lookup", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await staffCase(request(), context)).status).toBe(401);
    expect(mocks.staffCase).not.toHaveBeenCalled();
  });
});
