import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), readable: vi.fn(), imageGet: vi.fn(), stream: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/media/service", () => ({ findReadableMedia: mocks.readable }));
vi.mock("@/lib/media/storage", () => ({ mediaStorage: () => ({ get: mocks.imageGet }) }));
vi.mock("@/lib/media/multipart-storage", () => ({ multipartStorage: { stream: mocks.stream } }));
import { GET } from "./route";
const id = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4", context = { params: Promise.resolve({ id }) };
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "owner" }); mocks.readable.mockResolvedValue(null); });
describe("public-host media isolation", () => {
  it("uses the actual customer Host rather than Next's internal URL for private access", async () => {
    const response = await GET(new Request("http://localhost:3000/api/media/" + id, { headers: { host: "customer.lucia.name.ng", cookie: "lucia_os_session=synthetic" } }), context);
    expect(response.status).toBe(404);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.readable).toHaveBeenCalledWith(id, null);
  });
  it("streams published videos with byte-range response headers", async () => {
    mocks.readable.mockResolvedValue({object_key:"os/"+id+"/"+id+"/"+id+".mp4",bytes:12,kind:"video",mime:"video/mp4",etag:'"video-etag"',original_name:"demo.mp4",public:true});
    mocks.stream.mockResolvedValue(new Response("video",{status:206,headers:{"content-range":"bytes 0-4/12","content-length":"5"}}));
    const response=await GET(new Request("http://localhost:3000/api/media/"+id,{headers:{host:"customer.example","range":"bytes=0-4"}}),context);
    expect(response.status).toBe(206);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe("bytes 0-4/12");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(mocks.stream).toHaveBeenCalledWith("os/"+id+"/"+id+"/"+id+".mp4","bytes=0-4");
  });
  it("forces customer PDF assets to download with a sanitized filename", async () => {
    mocks.readable.mockResolvedValue({object_key:"os/"+id+"/"+id+"/"+id+".pdf",bytes:12,kind:"document",mime:"application/pdf",etag:'"pdf-etag"',original_name:"Annual report 2026.pdf",public:true});
    mocks.stream.mockResolvedValue(new Response("%PDF-",{status:200,headers:{"content-length":"5"}}));
    const response=await GET(new Request("http://localhost:3000/api/media/"+id,{headers:{host:"customer.example"}}),context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain("Annual%20report%202026.pdf");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
  });
  it("allows the platform hostname to check the authenticated private owner", async () => {
    await GET(new Request("http://localhost:3000/api/media/" + id, { headers: { host: "os.lucia.name.ng" } }), context);
    expect(mocks.readable).toHaveBeenCalledWith(id, "owner");
  });
});
