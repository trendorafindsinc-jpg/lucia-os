import { randomUUID, randomBytes, createHash } from "node:crypto";
/** Synthetic fixtures only: callers must enforce an isolated *_acceptance database. */
export async function createContinuityFixtures(admin) {
  const fixtures = {
    a: randomUUID(),
    b: randomUUID(),
    orgA: randomUUID(),
    orgB: randomUUID(),
    siteA: randomUUID(),
    siteB: randomUUID(),
    foreign: randomUUID(),
    tokens: {
      a: randomBytes(32).toString("hex"),
      b: randomBytes(32).toString("hex"),
    },
  };
  const draft = {
    templateId: "northstar-consulting",
    siteName: "Continuity website A",
    headline: "Continuity test headline",
    description: "Synthetic acceptance draft for state preservation tests.",
    buttonLabel: "Contact us",
    palette: "original",
    visibleSections: ["Hero", "Services", "Contact"],
  };
  await admin.begin(async (tx) => {
    await tx`INSERT INTO app_users(id,core_subject_id,display_name) VALUES(${fixtures.a},${"phase9-" + fixtures.a},'Continuity A'),(${fixtures.b},${"phase9-" + fixtures.b},'Continuity B')`;
    await tx`INSERT INTO organizations(id,name,slug) VALUES(${fixtures.orgA},'Continuity organization A',${"phase9-" + fixtures.orgA}),(${fixtures.orgB},'Continuity organization B',${"phase9-" + fixtures.orgB})`;
    await tx`INSERT INTO organization_memberships(organization_id,user_id,role,status) VALUES(${fixtures.orgA},${fixtures.a},'owner','active'),(${fixtures.orgB},${fixtures.b},'owner','active')`;
    for (const [site, org, title] of [
      [fixtures.siteA, fixtures.orgA, "Continuity website A"],
      [fixtures.siteB, fixtures.orgA, "Continuity website B"],
      [fixtures.foreign, fixtures.orgB, "Foreign website"],
    ]) {
      await tx`INSERT INTO websites(id,organization_id,name,slug) VALUES(${site},${org},${title},${"phase9-" + site})`;
      await tx`INSERT INTO website_pages(organization_id,website_id,title,path,status,content) VALUES(${org},${site},'Home','/','draft',${JSON.stringify({ ...draft, siteName: title })})`;
    }
    for (const who of ["a", "b"])
      await tx`INSERT INTO app_sessions(user_id,token_hash,expires_at) VALUES(${fixtures[who]},${createHash("sha256").update(fixtures.tokens[who]).digest("hex")},now()+interval '4 hours')`;
  });
  return fixtures;
}
export async function removeContinuityFixtures(admin, f) {
  await admin`DELETE FROM websites WHERE id IN (${f.siteA},${f.siteB},${f.foreign})`;
  await admin`DELETE FROM organizations WHERE id IN (${f.orgA},${f.orgB})`;
  await admin`DELETE FROM app_users WHERE id IN (${f.a},${f.b})`;
}
