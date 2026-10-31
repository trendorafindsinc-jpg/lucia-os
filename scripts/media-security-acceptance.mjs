/** Real isolated PostgreSQL/API denial cases. Synthetic metadata, no claim of a
 * successful provider upload. The live IDrive upload gate is separate. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function checkMediaSecurity({ admin, api, f }) {
  const foreign = randomUUID();
  await admin`insert into website_media(id,organization_id,website_id,created_by_user_id,object_key,bytes,width,height,alt,status) values(${foreign},${f.orgB},${f.foreign},${f.b},${'os/'+f.orgB+'/'+f.foreign+'/'+foreign+'.webp'},200,10,10,'Isolated denial fixture','ready')`;
  try {
    assert.equal((await api(null, `/api/websites/${f.siteA}/media`)).status, 401);
    assert.equal((await api("a", `/api/websites/${f.foreign}/media`)).status, 404);
    const library = await api("a", `/api/websites/${f.siteA}/media`);
    assert.equal(library.status, 200); assert(!(await library.text()).includes(foreign));
    assert.equal((await api("a", `/api/websites/${f.siteA}/media?id=${foreign}`, "DELETE")).status, 404);
    assert.equal((await api("a", "/api/staff/storage")).status, 403);
    assert.equal((await api("a", "/api/staff/storage", "PATCH", { websiteId: f.siteA, quotaBytes: 100000000 })).status, 403);
    const lookup = await admin`select * from lucia_public_media(${foreign}::uuid)`;
    assert.equal(lookup.length, 0, "Unpublished private media must never be publicly resolved");
    const endpoint = `/api/websites/${f.siteA}/draft`;
    let saved = await (await api("a", endpoint)).json();
    const assigned = await api("a", endpoint, "PATCH", { kind: "assign-layout", layoutId: "lucia.layout.meridian" }, { "if-match": saved.revision });
    assert.equal(assigned.status, 200);
    saved = await (await api("a", endpoint)).json();
    const denied = await api("a", endpoint, "PATCH", { kind: "composition-edit", mode: "guided", edits: [{ kind: "business-logo", src: "media:"+foreign, alt: "Stolen image" }] }, { "if-match": saved.revision });
    assert.equal(denied.status, 422);
    assert.equal((await (await api("a", endpoint)).json()).revision, saved.revision, "Denied image injection must leave the draft unchanged");
    console.log("PASS media: actual tenant/API denial, private publication gate, staff quota denial and unchanged revision after cross-website image injection");
  } finally { await admin`delete from website_media where id=${foreign}`; }
}
