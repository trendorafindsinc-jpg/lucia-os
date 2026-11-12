import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({getCurrentUser:mocks.user}));
vi.mock("@/components/workspace/desktop-workspace",()=>({DesktopWorkspace:()=>null}));
import DesktopWorkspacePage from "./page";

describe("desktop workspace server entry",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("denies signed-out users without mounting apps or cached drafts",async()=>{
    mocks.user.mockResolvedValue(null);
    const output=await DesktopWorkspacePage({searchParams:Promise.resolve({app:"/editor?websiteId=private"})});
    const html=renderToStaticMarkup(output);
    expect(html).toContain("Sign in to open Lattice");
    expect(html).not.toContain("private");
    expect(html).not.toContain("Website name");
  });
  it("binds cached desktop identity to the server session",async()=>{
    mocks.user.mockResolvedValue({id:"verified-user-a"});
    const output=await DesktopWorkspacePage({searchParams:Promise.resolve({app:"/editor?websiteId=site-a"})});
    expect(output.props).toMatchObject({userId:"verified-user-a",initialHref:"/editor?websiteId=site-a"});
  });
  it("rejects external, privileged and ambiguous initial app destinations",async()=>{
    mocks.user.mockResolvedValue({id:"user-a"});
    for(const app of ["https://evil.test","/staff",["/editor","/templates"],"/api/auth/me"]) {
      const output=await DesktopWorkspacePage({searchParams:Promise.resolve({app})});
      expect(output.props.initialHref).toBeUndefined();
    }
  });
});
