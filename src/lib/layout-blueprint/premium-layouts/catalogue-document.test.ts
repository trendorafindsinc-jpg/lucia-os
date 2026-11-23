import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";
import {premiumCandidateIds,premiumFlagshipIds} from "./catalogue-candidates";

describe("48-layout premium catalogue documentation",()=>{
  const document=readFileSync(resolve(process.cwd(),"docs/layouts-48-premium-catalogue.md"),"utf8");
  it("documents every canonical candidate and flagship without implying release approval",()=>{
    expect(premiumCandidateIds).toHaveLength(48);
    for(const id of premiumCandidateIds) expect(document).toContain("`"+id+"`");
    for(const id of premiumFlagshipIds) expect(document).toContain(id.slice("lucia.layout.".length));
    expect(document).toContain("not a release or purchasing approval");
    expect(document).toContain("Acceptance boundary");
  });
});
