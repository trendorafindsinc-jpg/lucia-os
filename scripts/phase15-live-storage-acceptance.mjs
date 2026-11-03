/**
 * Manual-only Phase 15 REAL IDrive acceptance.
 * Uses compiled Next.js routes, isolated synthetic sessions, actual S3 bytes.
 * Never point this at customer/production databases. No OAuth claim.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash, createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import net from "node:net";
import http from "node:http";
import postgres from "postgres";
import sharp from "sharp";
import { createContinuityFixtures, removeContinuityFixtures } from "./continuity-fixtures.mjs";

const artifact = "artifacts/phase15-live-storage/report.json";
const sha = process.env.GITHUB_SHA || "local-uncommitted";
const result = {
  testedCommit: sha, environment: "manual GitHub Actions / compiled local Next.js / isolated PostgreSQL",
  identity: "isolated synthetic hashed application sessions; live LUCIA Core OAuth NOT tested",
  databaseIsolation: false, provider: "IDrive e2 London-2", bucket: "lucia-os-customer-media-2026",
  testsPassed: 0, testsFailed: 0, tests: [], objects: [], cleanup: "NOT_RUN",
  verified: false, historicalV2Rollback: "NOT_RUN",
  credentialScope: "REQUIRES_PROVIDER_SCOPE_EVIDENCE"
};
let admin, runtime, fixture, child, base, port;
const created = new Set(), synthetic = new Set();
let appLog = "";
const checkpoint = async (name, action) => {
  try { const detail = await action(); result.testsPassed++; result.tests.push({ name, status: "PASS" }); return detail; }
  catch (error) { result.testsFailed++; result.tests.push({ name, status: "FAIL", reason: error instanceof Error ? error.message.slice(0,240) : "Unknown failure" }); throw error; }
};
const query = async (statement, params = []) => admin.unsafe(statement, params);
const only = async (statement, params = []) => (await query(statement, params))[0];
const expectStatus = async (promise, status, label) => {
  const r = await promise;
  assert.equal(r.status, status, label + " expected " + status + " received " + r.status);
  return r;
};
function credentialsAndIsolation() {
  const required = ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "WEBSITE_TEST_ADMIN_URL", "WEBSITE_TEST_RUNTIME_URL"];
  assert(required.every((name) => process.env[name]), "Missing separately configured restricted GitHub Actions secrets or isolated DB URLs");
  assert.equal(process.env.S3_ENDPOINT, "https://s3.eu-west-3.idrivee2.com");
  assert.equal(process.env.S3_REGION, "eu-west-3");
  assert.equal(process.env.S3_BUCKET, "lucia-os-customer-media-2026");
  assert.equal(process.env.MEDIA_UPLOADS_ENABLED, "1");
  assert.equal(process.env.MEDIA_PRODUCT_BUDGET_BYTES, "2000000000");
  const a = new URL(process.env.WEBSITE_TEST_ADMIN_URL);
  const b = new URL(process.env.WEBSITE_TEST_RUNTIME_URL);
  assert(["127.0.0.1","localhost"].includes(a.hostname) && ["127.0.0.1","localhost"].includes(b.hostname), "Database must be a disposable local PostgreSQL service");
  assert.equal(a.pathname, b.pathname);
  assert.equal(a.pathname, "/lucia_phase15_acceptance");
  result.databaseIsolation = true;
}
async function startApp(endpointOverride) {
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  base = "http://localhost:" + port;
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, NODE_ENV: "production", VERCEL_ENV: "preview", S3_ENDPOINT: endpointOverride || process.env.S3_ENDPOINT,
      DATABASE_URL_RUNTIME: process.env.WEBSITE_TEST_RUNTIME_URL,
      APP_BASE_URL: base, LUCIA_SITE_DOMAIN: "lucia.name.ng" },
    stdio: ["ignore","pipe","pipe"]
  });
  // Never persist or print raw server output; even a faulty dependency might log secrets.
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) throw Error("Compiled application exited before startup");
    try { const r = await fetch(base, { signal: AbortSignal.timeout(1000) }); if (r.status < 500) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw Error("Compiled application did not start");
}
async function stopApp() {
  if (!child) return;
  const previous=child; child=null;
  if (previous.exitCode===null) await new Promise((resolve) => {
    previous.once("exit", resolve); previous.kill();
  });
}
function api(who, route, method="GET", body, headers={}) {
  const h = { ...(who ? {cookie:"lucia_os_session="+fixture.tokens[who]} : {}),
    ...(method === "GET" ? {} : {origin:base}), ...headers };
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload) h["content-type"]="application/json";
  return fetch(base + route, { method, headers:h, body:payload, signal:AbortSignal.timeout(35000) });
}
function upload(who, site, png, mime="image/png", alt="Synthetic test image") {
  const form = new FormData();
  form.append("file", new Blob([png], { type:mime }), "acceptance.png");
  form.append("alt", alt);
  return fetch(base+"/api/websites/"+site+"/media", {
    method:"POST", headers:{ origin:base, ...(who ? {cookie:"lucia_os_session="+fixture.tokens[who]} : {}) },
    body:form, signal:AbortSignal.timeout(45000)
  });
}
async function uploadMultipartAsset(site, kind, mime, filename, bytes) {
  const sha256=createHash("sha256").update(bytes).digest("hex");
  const createdResponse=await api("a","/api/websites/"+site+"/media/assets","POST",{
    action:"create",kind,mime,filename,bytes:bytes.length,sha256,
    headerBase64:bytes.subarray(0,32).toString("base64"),
    alt:"Real external storage acceptance asset",
    caption:"Synthetic Phase 15 storage test",
    durationMs:kind==="video"?1000:null
  });
  const session=await createdResponse.json();
  assert.equal(createdResponse.status,200,session.error);
  assert.equal(session.partCount,1,"Small canary asset must use one multipart part");
  const partResponse=await fetch(session.parts[0].url,{method:"PUT",body:new Uint8Array(bytes),signal:AbortSignal.timeout(30000)});
  assert.equal(partResponse.status,200,"IDrive multipart part upload failed");
  const etag=partResponse.headers.get("etag");
  assert(etag,"IDrive did not return a part ETag");
  const completed=await api("a","/api/websites/"+site+"/media/assets","POST",{
    action:"complete",mediaId:session.mediaId,uploadId:session.uploadId,
    parts:[{partNumber:1,etag}]
  });
  const asset=await completed.json();
  assert.equal(completed.status,200,asset.error);
  created.add(asset.id);
  result.objects.push({id:asset.id,bytes:asset.bytes,kind,store:"created_by_real_application_multipart"});
  const row=await mediaRow(asset.id);
  assert(row&&row.status==="ready");
  assert.equal(row.kind,kind);
  assert.equal(row.checksum,sha256);
  assert.equal(row.bytes,bytes.length);
  const head=await assertReadableHead(await signHead(row.object_key),"IDrive multipart object HEAD");
  assert.equal(Number(head.headers.get("content-length")),bytes.length);
  const full=await api("a","/_media/"+asset.id);
  assert.equal(full.status,200,"Application could not read private multipart asset");
  assert.deepEqual(Buffer.from(await full.arrayBuffer()),bytes);
  const ranged=await api("a","/_media/"+asset.id,"GET",undefined,{range:"bytes=0-7"});
  assert.equal(ranged.status,206,"Application range read did not return 206");
  assert.deepEqual(Buffer.from(await ranged.arrayBuffer()),bytes.subarray(0,8));
  return asset;
}
function hostRead(host, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname:"127.0.0.1", port, path, headers:{host} }, (res) => {
      const chunks=[];res.on("data",(chunk)=>chunks.push(chunk));
      res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks)}));
    });
    req.on("error",reject);req.setTimeout(30000,()=>req.destroy(Error("Host request timed out")));
  });
}
function signObjectRequest(method,bucket,objectKey,body) {
  const endpoint = new URL(process.env.S3_ENDPOINT);
  const url = new URL("/"+bucket+"/"+objectKey,endpoint);
  const when=new Date().toISOString().replace(/[:-]|\.\d{3}/g,""), day=when.slice(0,8);
  const payload=body??Buffer.alloc(0);
  const hash=createHash("sha256").update(payload).digest("hex");
  const heads={host:url.host,"x-amz-content-sha256":hash,"x-amz-date":when};
  if(method==="PUT"){heads["content-type"]="application/octet-stream";heads["x-amz-server-side-encryption"]="AES256";}
  const names=Object.keys(heads).sort();
  const hashText=(v)=>createHash("sha256").update(v).digest("hex");
  const hm=(key,val)=>createHmac("sha256",key).update(val).digest();
  const scope=day+"/"+process.env.S3_REGION+"/s3/aws4_request";
  const canonical=[method,url.pathname,"",names.map((n)=>n+":"+heads[n]+"\n").join(""),names.join(";"),hash].join("\n");
  const kd=hm("AWS4"+process.env.S3_SECRET_ACCESS_KEY,day);
  const sig=hm(hm(hm(hm(kd,process.env.S3_REGION),"s3"),"aws4_request"),
    "AWS4-HMAC-SHA256\n"+when+"\n"+scope+"\n"+hashText(canonical)).toString("hex");
  heads.authorization="AWS4-HMAC-SHA256 Credential="+process.env.S3_ACCESS_KEY_ID+"/"+scope+
    ", SignedHeaders="+names.join(";")+", Signature="+sig;
  return fetch(url,{method,headers:heads,...(method==="PUT"?{body:new Uint8Array(payload)}:{}),signal:AbortSignal.timeout(15000),redirect:"error",cache:"no-store"});
}
function signBucketRequest(bucket) {
  const endpoint = new URL(process.env.S3_ENDPOINT);
  const url = new URL("/"+bucket,endpoint);
  url.search="list-type=2";
  const when=new Date().toISOString().replace(/[:-]|\.\d{3}/g,""), day=when.slice(0,8);
  const hash=createHash("sha256").update("").digest("hex");
  const heads={host:url.host,"x-amz-content-sha256":hash,"x-amz-date":when};
  const names=Object.keys(heads).sort();
  const hashText=(v)=>createHash("sha256").update(v).digest("hex");
  const hm=(key,val)=>createHmac("sha256",key).update(val).digest();
  const scope=day+"/"+process.env.S3_REGION+"/s3/aws4_request";
  const canonical=["GET",url.pathname,"list-type=2",names.map((n)=>n+":"+heads[n]+"\n").join(""),names.join(";"),hash].join("\n");
  const kd=hm("AWS4"+process.env.S3_SECRET_ACCESS_KEY,day);
  const sig=hm(hm(hm(hm(kd,process.env.S3_REGION),"s3"),"aws4_request"),
    "AWS4-HMAC-SHA256\n"+when+"\n"+scope+"\n"+hashText(canonical)).toString("hex");
  heads.authorization="AWS4-HMAC-SHA256 Credential="+process.env.S3_ACCESS_KEY_ID+"/"+scope+
    ", SignedHeaders="+names.join(";")+", Signature="+sig;
  return fetch(url,{method:"GET",headers:heads,signal:AbortSignal.timeout(15000),redirect:"error",cache:"no-store"});
}
function signHead(objectKey,bucket=process.env.S3_BUCKET) {
  return signObjectRequest("HEAD",bucket,objectKey);
}
async function assertReadableHead(response,label,expectedStatus=200) {
  if(response.status!==expectedStatus) {
    const xml=(await response.text()).slice(0,2000);
    const code=xml.match(/<Code>([^<]+)<\/Code>/)?.[1] ?? "unknown";
    const message=xml.match(/<Message>([^<]+)<\/Message>/)?.[1] ?? "No provider message";
    throw Error(label+" expected "+expectedStatus+" received "+response.status+"; providerCode="+code+"; providerMessage="+message);
  }
  return response;
}

async function imageInput(w=520,h=390) {
  const raw=randomBytes(w*h*3);
  return sharp(raw,{raw:{width:w,height:h,channels:3}}).png().toBuffer();
}
async function mediaRow(id) {
  return only("select id,organization_id,website_id,object_key,bytes,width,height,status,last_published_at,kind,mime,original_name,checksum,etag from website_media where id=$1",[id]);
}
async function newMedia(who,site,input,alt) {
  const response=await upload(who,site,input,"image/png",alt);
  const data=await response.json();
  assert.equal(response.status,201,"App upload denied: "+(data.error || response.status));
  assert(data.image?.ref?.startsWith("media:"));
  created.add(data.image.id);
  result.objects.push({id:data.image.id,bytes:data.image.bytes,store:"created_by_real_application"});
  return data.image;
}
async function edit(site,edits,who="a",mode="guided") {
  const route="/api/websites/"+site+"/draft";
  const before=await (await expectStatus(api(who,route),200,"Read draft")).json();
  const r=await api(who,route,"PATCH",{kind:"composition-edit",mode,edits},{"if-match":before.revision});
  await expectStatus(Promise.resolve(r),200,"Persist v2 changes");
  return (await expectStatus(api(who,route),200,"Reload draft")).json();
}
async function publish(site,slug,who="a") {
  const saved=await (await api(who,"/api/websites/"+site+"/draft")).json();
  const first=saved.draft.pages.find((p)=>p.path==="/");
  return api(who,"/api/publishing/publish","POST",{
    action:"publish",websiteId:site,siteSlug:slug,siteName:saved.draft.identity.name,
    headline:first.title.slice(0,100),description:first.description,customDomain:""
  },{"if-match":saved.revision});
}
async function verifyObject(image) {
  const row=await mediaRow(image.id);
  assert(row && row.status==="ready");
  assert.equal(row.organization_id,fixture.orgA);
  assert.equal(row.website_id,fixture.siteA);
  assert.equal(Number(row.bytes),image.bytes);
  assert(row.object_key.startsWith("os/"+fixture.orgA+"/"+fixture.siteA+"/"));
  assert(image.width<=1600 && image.height<=1600 && image.bytes>0 && image.bytes<=260000);
  const head=await assertReadableHead(await signHead(row.object_key),"Actual IDrive object HEAD");
  assert.equal(Number(head.headers.get("content-length")),image.bytes);
  assert.equal(head.headers.get("content-type"),"image/webp");
  const enc=head.headers.get("x-amz-server-side-encryption");
  if (enc) assert.equal(enc,"AES256");
  const read=await expectStatus(api("a","/_media/"+image.id),200,"Application private media download");
  const bytes=Buffer.from(await read.arrayBuffer());
  assert.equal(bytes.length,image.bytes);
  const meta=await sharp(bytes).metadata();
  assert.equal(meta.format,"webp");
  assert.equal(meta.width,image.width);
  assert.equal(meta.height,image.height);
  result.storedObjectBytes=image.bytes;
  return row;
}
async function seedPlaceholder(site,org,who,bytes,createdAtMinutes=5) {
  const id=randomUUID();
  const key="os/"+org+"/"+site+"/"+id+".webp";
  await query("insert into website_media(id,organization_id,website_id,created_by_user_id,object_key,bytes,width,height,alt,status,created_at) values($1,$2,$3,$4,$5,$6,1,1,'Synthetic capacity reservation','pending',now()-($7*interval '1 minute'))",
    [id,org,site,who,key,bytes,createdAtMinutes]);
  await query("update media_storage_budget set reserved_bytes=reserved_bytes+$1 where product='lucia-os'",[bytes]);
  synthetic.add(id);
  return id;
}
async function erasePlaceholder(id) {
  const row=await mediaRow(id);
  if (!row) return;
  assert(synthetic.has(id),"Refusing to remove a non-synthetic reservation");
  await query("delete from website_media where id=$1 and status='pending'",[id]);
  await query("update media_storage_budget set reserved_bytes=reserved_bytes-$1 where product='lucia-os'",[Number(row.bytes)]);
  synthetic.delete(id);
}
async function cleanup() {
  if (!admin || !fixture) return "NOT_STARTED";
  let complete=true;
  // These pages/users were generated within the throwaway database by createContinuityFixtures.
  // No other website ID or bucket object is eligible for cleanup.
  for (const id of synthetic) {
    try { await erasePlaceholder(id); } catch { complete=false; }
  }
  try {
    await query("update website_pages set content='{}',published_content=null,status='draft' where website_id in ($1,$2)",[fixture.siteA,fixture.foreign]);
    await query("delete from website_versions where website_id in ($1,$2)",[fixture.siteA,fixture.foreign]);
    await query("update website_media set last_published_at=now()-interval '31 days' where id=any($1::uuid[]) and website_id=$2",
      [[...created],fixture.siteA]); // Time-expiry override limited to synthetic ephemeral fixtures.
  } catch { complete=false; }
  for (const id of created) {
    try {
      const row=await mediaRow(id);
      if (!row) continue;
      if (!row.object_key.startsWith("os/"+fixture.orgA+"/"+fixture.siteA+"/")) { complete=false; continue; }
      const res=await api("a","/api/websites/"+fixture.siteA+"/media?id="+id,"DELETE");
      if (res.status!==200) {complete=false;continue;}
      const head=await signHead(row.object_key);
      if (head.status!==404) {complete=false;continue;}
      await query("delete from website_media where id=$1 and status='deleted'",[id]);
    } catch { complete=false; }
  }
  try {
    const remaining=await query("select object_key,status from website_media where website_id=$1",[fixture.siteA]);
    if (remaining.length) complete=false;
    if (complete) await removeContinuityFixtures(admin,fixture);
  } catch { complete=false; }
  return complete ? "PASS_APP_DELETION_AND_S3_404" : "INCOMPLETE_RETAIN_UNCERTAIN_OBJECTS";
}
try {
  credentialsAndIsolation();
  await checkpoint("isolated-postgresql-runtime-rls",async()=>{
    admin=postgres(process.env.WEBSITE_TEST_ADMIN_URL,{max:3,prepare:false});
    runtime=postgres(process.env.WEBSITE_TEST_RUNTIME_URL,{max:1,prepare:false});
    const [role]=await runtime.unsafe("select rolsuper,rolbypassrls from pg_roles where rolname=current_user");
    assert(!role.rolsuper && !role.rolbypassrls);
    const [tables]=await query("select count(*)::int as count from information_schema.tables where table_schema='public' and table_name in ('website_media','media_storage_budget','website_media_limits')");
    assert.equal(tables.count,3);
    fixture=await createContinuityFixtures(admin);
    await runtime.end(); runtime=null;
  });
  await startApp();
  const firstPng=await imageInput();
  let original,replacement;
  await checkpoint("independent-bucket-list-and-write-scope-denial",async()=>{
    const probeBucket=process.env.S3_SCOPE_PROBE_BUCKET;
    assert.equal(probeBucket,"lucia-os-phase15-scope-probe-2026","A separately administered existing probe bucket is required");
    const probeKey="scope-check/"+randomUUID()+".bin";
    const deniedList=await signBucketRequest(probeBucket);
    const deniedListXml=await deniedList.text();
    const deniedListCode=deniedListXml.match(/<Code>([^<]+)<\/Code>/)?.[1]??"unknown";
    assert.equal(deniedList.status,403,"The GitHub IDrive key can list objects outside its assigned customer-media bucket");
    assert.equal(deniedListCode,"AccessDenied","Probe listing must be denied by bucket scope, not by an invalid signature");
    const deniedRead=await signObjectRequest("GET",probeBucket,probeKey);
    const deniedReadXml=await deniedRead.text();
    const deniedReadCode=deniedReadXml.match(/<Code>([^<]+)<\/Code>/)?.[1]??"unknown";
    assert([403,404].includes(deniedRead.status),"The GitHub IDrive key received an unexpected response for an absent probe object");
    if(deniedRead.status===403) assert.equal(deniedReadCode,"AccessDenied","Probe object read must be denied");
    if(deniedRead.status===404) assert.equal(deniedReadCode,"NoSuchKey","The probe bucket has no object at this key; no object bytes were disclosed");
    const deniedWrite=await signObjectRequest("PUT",probeBucket,probeKey,Buffer.from("phase15-scope-probe"));
    if(deniedWrite.ok){
      await signObjectRequest("DELETE",probeBucket,probeKey).catch(()=>{});
      throw Error("The GitHub IDrive key can write outside its assigned customer-media bucket");
    }
    const deniedWriteXml=await deniedWrite.text();
    const deniedWriteCode=deniedWriteXml.match(/<Code>([^<]+)<\/Code>/)?.[1]??"unknown";
    assert.equal(deniedWrite.status,403,"The GitHub IDrive key has unexpected access outside its assigned customer-media bucket");
    assert.equal(deniedWriteCode,"AccessDenied","Probe write must be denied by bucket scope, not by an invalid signature");
    result.credentialScope="VERIFIED_LIST_AND_WRITE";
    result.credentialScopeEvidence={list:deniedListCode,read:deniedReadCode,write:deniedWriteCode};
  });
  await checkpoint("authenticated-real-png-to-idrive-and-metadata",async()=>{
    const x=await upload("a",fixture.siteA,firstPng,"image/png","Original synthetic gallery scene");
    const json=await x.json();assert.equal(x.status,201,json.error);
    original=json.image;created.add(original.id);
    result.objects.push({id:original.id,bytes:original.bytes,store:"created_by_real_application"});
    await verifyObject(original);
  });
  await checkpoint("real-idrive-multipart-video-pdf-upload-checksum-and-range-read",async()=>{
    const mp4=Buffer.from("0000ftypisom00000000synthetic-mp4-payload");
    const pdf=Buffer.from("%PDF-1.4\\n1 0 obj\\n<< /Type /Catalog >>\\nendobj\\n%%EOF");
    await uploadMultipartAsset(fixture.siteA,"video","video/mp4","phase15-canary.mp4",mp4);
    await uploadMultipartAsset(fixture.siteA,"document","application/pdf","phase15-canary.pdf",pdf);
  });
  await checkpoint("cross-tenant-private-read-delete-and-auth",async()=>{
    assert.equal((await api(null,"/_media/"+original.id)).status,404);
    assert.equal((await api("b","/_media/"+original.id)).status,404);
    assert.equal((await api("b","/api/websites/"+fixture.siteA+"/media")).status,404);
    assert.equal((await api("b","/api/websites/"+fixture.siteA+"/media?id="+original.id,"DELETE")).status,404);
    assert([404,405].includes((await api("b","/api/websites/"+fixture.siteA+"/media","PATCH",{alt:"takeover"})).status));
    assert.equal((await api("b","/api/websites/"+fixture.siteA+"/draft")).status,404);
    assert.equal((await upload(null,fixture.siteA,firstPng)).status,401);
  });
  await checkpoint("media-library-visibility-and-byte-accounting",async()=>{
    const r=await expectStatus(api("a","/api/websites/"+fixture.siteA+"/media"),200,"Library");
    const lib=await r.json();
    assert.equal(lib.quotaBytes,5000000);
    assert(lib.items.some((x)=>x.id===original.id && x.status==="ready"));
    const totals=await query("select kind,coalesce(sum(bytes),0)::bigint as used from website_media where website_id=$1 and status<>'deleted' group by kind",[fixture.siteA]);
    const byKind=Object.fromEntries(totals.map((row)=>[row.kind,Number(row.used)]));
    assert.equal(lib.usedBytes,Object.values(byKind).reduce((sum,value)=>sum+value,0));
    assert.equal(lib.imageUsedBytes,byKind.image??0);
    assert.equal(lib.videoUsedBytes,byKind.video??0);
    assert.equal(lib.documentUsedBytes,byKind.document??0);
  });
  await checkpoint("spoofed-invalid-and-corrupted-image-rejection",async()=>{
    for (const [bytes,mime] of [[Buffer.from("garbage"),"image/png"],[firstPng,"image/jpeg"],[Buffer.from("badformat"),"text/plain"]]) {
      const r=await upload("a",fixture.siteA,bytes,mime);
      assert([413,422].includes(r.status),"Input rejection status "+r.status);
    }
    const oversize=await upload("a",fixture.siteA,randomBytes(4_100_000));
    assert.equal(oversize.status,413);
  });
  let saved,slug,home,hero;
  await checkpoint("tenant-guarded-layout-and-section-save-reload",async()=>{
    const draft="/api/websites/"+fixture.siteA+"/draft";
    const previous=await (await api("a",draft)).json();
    await expectStatus(api("a",draft,"PATCH",{kind:"assign-layout",layoutId:"lucia.layout.canvas"},{"if-match":previous.revision}),200,"Layout assignment");
    saved=await (await api("a",draft)).json();
    home=saved.draft.pages.find((p)=>p.path==="/");
    hero=home.sections.find((s)=>s.type==="premium-hero");
    assert(hero);
    const contact=saved.draft.pages.find((p)=>p.path==="/contact");
    assert(contact);
    saved=await edit(fixture.siteA,[
      {kind:"business-detail",field:"enquiryEmail",value:"phase15-acceptance@testing.example.ng"},
      {kind:"business-logo",src:original.ref,alt:"Original synthetic logo"},
      {kind:"replace-section",pageId:home.id,section:{...hero,image:{src:original.ref,alt:"Original synthetic hero"}}}
    ]);
    assert.equal(saved.draft.identity.profile.logo.src,original.ref);
    assert.equal(saved.draft.pages.find((p)=>p.id===home.id).sections.find((s)=>s.id===hero.id).image.src,original.ref);
    const [site]=await query("select slug from websites where id=$1",[fixture.siteA]); slug=site.slug;
    const beforeB=await (await api("b","/api/websites/"+fixture.foreign+"/draft")).json();
    await expectStatus(api("b","/api/websites/"+fixture.foreign+"/draft","PATCH",{kind:"assign-layout",layoutId:"lucia.layout.canvas"},{"if-match":beforeB.revision}),200,"B own Layout");
    const b=await (await api("b","/api/websites/"+fixture.foreign+"/draft")).json();
    await expectStatus(api("b","/api/websites/"+fixture.foreign+"/draft","PATCH",
      {kind:"composition-edit",mode:"guided",edits:[{kind:"business-logo",src:original.ref,alt:"Stolen"}]},
      {"if-match":b.revision}),422,"Cross-account media attachment");
    assert.equal((await api("b","/api/publishing/publish","POST",{
      action:"publish",websiteId:fixture.siteA,siteSlug:slug,siteName:saved.draft.identity.name,
      headline:saved.draft.pages[0].title,description:saved.draft.pages[0].description,customDomain:""
    },{"if-match":saved.revision})).status,404);
  });
  await checkpoint("historical-v2-composition-checkpoint-restore",async()=>{
    const checkpointSnapshot={
      siteName:saved.draft.identity.name,
      headline:saved.draft.pages.find((page)=>page.path==="/").title.slice(0,100),
      description:saved.draft.pages.find((page)=>page.path==="/").description.slice(0,220),
      palette:"original",
      visibleSections:["hero","editorial"],
      pages:[{id:"home",title:"Home",slug:"",sectionTypes:["hero","editorial"]}],
      seoTitle:saved.draft.identity.name.slice(0,70),
      seoDescription:saved.draft.identity.description.slice(0,200),
      contentPostCount:0,
      composition:saved.draft
    };
    const savedVersion=await api("a","/api/websites/"+fixture.siteA+"/versions","POST",{
      label:"Phase 15 historical v2 rollback canary",
      notes:"Synthetic isolated acceptance checkpoint",
      snapshot:checkpointSnapshot
    });
    const versionBody=await savedVersion.json();
    assert.equal(savedVersion.status,201,versionBody.error);
    const originalHeadline=checkpointSnapshot.headline;
    const publishedBefore=await only("select published_content from website_pages where website_id=$1 and path='/'",[fixture.siteA]);
    const current=await (await api("a","/api/websites/"+fixture.siteA+"/draft")).json();
    const foreignRestore=await api("b","/api/websites/"+fixture.siteA+"/versions/"+versionBody.id+"/restore","POST",undefined,{"if-match":current.revision});
    assert.equal(foreignRestore.status,404,"Cross-tenant version restore must not reveal or mutate another website");
    const changed=await edit(fixture.siteA,[{
      kind:"page-details",pageId:home.id,path:"/",title:"Temporary changed composition",description:home.description,navigation:true
    }],"a","advanced");
    assert.equal(changed.draft.pages.find((page)=>page.path==="/").title,"Temporary changed composition");
    const staleRestore=await api("a","/api/websites/"+fixture.siteA+"/versions/"+versionBody.id+"/restore","POST",undefined,{"if-match":current.revision});
    assert.equal(staleRestore.status,409,"Stale draft revisions must not be overwritten by rollback");
    const restore=await api("a","/api/websites/"+fixture.siteA+"/versions/"+versionBody.id+"/restore","POST",undefined,{"if-match":changed.revision});
    const restoreBody=await restore.json();
    assert.equal(restore.status,200,restoreBody.error);
    assert.equal(restoreBody.published,false);
    const restored=await (await api("a","/api/websites/"+fixture.siteA+"/draft")).json();
    assert.equal(restored.draft.pages.find((page)=>page.path==="/").title,originalHeadline);
    assert.equal(restored.draft.layoutId,saved.draft.layoutId);
    assert.deepEqual(restored.draft.pages.map((page)=>page.sections),saved.draft.pages.map((page)=>page.sections));
    const publishedAfter=await only("select published_content from website_pages where website_id=$1 and path='/'",[fixture.siteA]);
    assert.equal(publishedAfter.published_content,publishedBefore.published_content,"Draft rollback must not change published content");
    result.historicalV2Rollback="PASS_FULL_COMPOSITION_RESTORED_DRAFT_ONLY";
  });
  await checkpoint("private-studio-preview-with-real-image",async()=>{
    const { chromium }=await import("playwright");
    const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
    try {
      const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
      await ctx.addCookies([{name:"lucia_os_session",value:fixture.tokens.a,url:base}]);
      const page=await ctx.newPage();
      await page.goto(base+"/editor?websiteId="+fixture.siteA,{waitUntil:"networkidle"});
      await page.getByRole("button",{name:"Manage Media",exact:true}).click();
      await page.getByText("Your media library",{exact:true}).waitFor({timeout:20000});
      await page.getByText("Your media library",{exact:true}).click();
      await page.locator('img[src="/_media/'+original.id+'"]').first().waitFor({timeout:20000});
      const preview=await page.locator('[data-layout-id="lucia.layout.canvas"]').first();
      assert(await preview.count());
      assert(await page.locator('img[src="/_media/'+original.id+'"]').count()>0);
      await page.screenshot({path:"artifacts/phase15-live-storage/studio-390.png",fullPage:false});
      await ctx.close();
    } finally {await browser.close();}
  });
  await checkpoint("public-publish-and-real-provider-image-delivery",async()=>{
    const r=await publish(fixture.siteA,slug);
    const data=await r.json();assert.equal(r.status,200,data.error);
    const hostname=slug+".lucia.name.ng";
    const page=await hostRead(hostname,"/");
    assert.equal(page.status,200);
    assert(page.bytes.toString().includes("/_media/"+original.id));
    const image=await hostRead(hostname,"/_media/"+original.id);
    assert.equal(image.status,200);
    assert.equal(image.headers["content-type"],"image/webp");
    assert.equal(image.bytes.length,original.bytes);
    assert.equal((await sharp(image.bytes).metadata()).format,"webp");
  });
  await checkpoint("reference-aware-published-image-delete-denial",async()=>{
    assert.equal((await api("a","/api/websites/"+fixture.siteA+"/media?id="+original.id,"DELETE")).status,409);
  });
  await checkpoint("real-replacement-and-publish-reversion",async()=>{
    replacement=await newMedia("a",fixture.siteA,await imageInput(460,340),"Replacement synthetic scene");
    await verifyObject(replacement);
    const prior=await (await api("a","/api/websites/"+fixture.siteA+"/draft")).json();
    const old=prior.draft.pages.find((p)=>p.id===home.id).sections.find((s)=>s.id===hero.id);
    const next=await edit(fixture.siteA,[
      {kind:"business-logo",src:replacement.ref,alt:"Replacement synthetic logo"},
      {kind:"replace-section",pageId:home.id,section:{...old,image:{src:replacement.ref,alt:"Replacement synthetic hero"}}}
    ]);
    assert.equal((await publish(fixture.siteA,slug)).status,200);
    assert((await hostRead(slug+".lucia.name.ng","/")).bytes.toString().includes("/_media/"+replacement.id));
    const restored=next.draft.pages.find((p)=>p.id===home.id).sections.find((s)=>s.id===hero.id);
    await edit(fixture.siteA,[
      {kind:"business-logo",src:original.ref,alt:"Original synthetic logo"},
      {kind:"replace-section",pageId:home.id,section:{...restored,image:{src:original.ref,alt:"Original synthetic hero"}}}
    ]);
    assert.equal((await publish(fixture.siteA,slug)).status,200);
    const restoredHtml=(await hostRead(slug+".lucia.name.ng","/")).bytes.toString();
    assert(restoredHtml.includes("/_media/"+original.id));
    assert.equal((await hostRead(slug+".lucia.name.ng","/_media/"+original.id)).status,200);
    result.publishingReversion="PASS_PREVIOUS_COMPOSITION_REPUBLISHED";
  });
  await checkpoint("unreferenced-object-delete-and-accounting",async()=>{
    const temp=await newMedia("a",fixture.siteA,await imageInput(210,160),"Delete-only synthetic image");
    await verifyObject(temp);
    const before=await (await api("a","/api/websites/"+fixture.siteA+"/media")).json();
    await expectStatus(api("a","/api/websites/"+fixture.siteA+"/media?id="+temp.id,"DELETE"),200,"Unreferenced delete");
    created.delete(temp.id);
    const after=await (await api("a","/api/websites/"+fixture.siteA+"/media")).json();
    assert.equal(after.usedBytes,before.usedBytes-temp.bytes);
    assert.equal((await signHead((await mediaRow(temp.id)).object_key)).status,404);
    await query("delete from website_media where id=$1 and status='deleted'",[temp.id]);
  });
  await checkpoint("atomic-concurrent-site-quota-reservation",async()=>{
    const sample=await imageInput(420,320);
    const candidate=await sharp(sample).webp({quality:78,effort:4}).toBuffer();
    const bytes=candidate.length;
    assert(bytes>0 && bytes<260000);
    const count=await only("select coalesce(sum(bytes),0)::int as used from website_media where website_id=$1 and status<>'deleted'",[fixture.siteA]);
    const used=Number(count.used);
    const quota=Math.max(260000,used+Math.floor(1.5*bytes));
    const prefill=Math.max(0,quota-used-Math.floor(1.5*bytes));
    if (prefill>0) await seedPlaceholder(fixture.siteA,fixture.orgA,fixture.a,prefill);
    await query("insert into website_media_limits(website_id,quota_bytes) values($1,$2) on conflict(website_id) do update set quota_bytes=excluded.quota_bytes",[fixture.siteA,quota]);
    const replies=await Promise.all([upload("a",fixture.siteA,sample,"image/png","Concurrent synthetic A"),
                                 upload("a",fixture.siteA,sample,"image/png","Concurrent synthetic B")]);
    const statuses=replies.map((r)=>r.status).sort();
    assert.deepEqual(statuses,[201,413],"Only one racing reservation may fit");
    for (const r of replies) if (r.status===201) {
      const obj=(await r.json()).image;created.add(obj.id);
      result.objects.push({id:obj.id,bytes:obj.bytes,store:"created_by_real_application"});
      await verifyObject(obj);
    }
    await query("delete from website_media_limits where website_id=$1",[fixture.siteA]);
    for(const id of [...synthetic]) await erasePlaceholder(id);
  });
  await checkpoint("200-image-boundary-with-isolated-pending-reservations",async()=>{
    const [baseCount]=await query("select count(*)::int as count from website_media where website_id=$1 and status<>'deleted'",[fixture.siteA]);
    const need=200-baseCount.count;assert(need>0 && need<200);
    for(let i=0;i<need;i++) await seedPlaceholder(fixture.siteA,fixture.orgA,fixture.a,1);
    const response=await upload("a",fixture.siteA,await imageInput(90,80));
    assert.equal(response.status,413);
    for(const id of [...synthetic]) await erasePlaceholder(id);
  });
  await checkpoint("two-gigabyte-product-budget-guard_without_large_upload",async()=>{
    const current=await only("select reserved_bytes from media_storage_budget where product='lucia-os'");
    const prior=Number(current.reserved_bytes);
    await query("update media_storage_budget set reserved_bytes=1999999999 where product='lucia-os'");
    try { const response=await upload("a",fixture.siteA,await imageInput(130,110));
      assert.equal(response.status,507);
    } finally {await query("update media_storage_budget set reserved_bytes=$1 where product='lucia-os'",[prior]);}
  });
  await checkpoint("storage-transport-outage-pending-reservation-and-recovery",async()=>{
    const before=await only("select reserved_bytes from media_storage_budget where product='lucia-os'");
    const baseline=await query("select id from website_media where website_id=$1 and status='pending'",[fixture.siteA]);
    const known=new Set(baseline.map((x)=>x.id));
    await stopApp();
    try {
      // A loopback connection refusal exercises the actual signed S3 adapter's failure
      // path. This is a simulated transport outage, NOT a live IDrive service incident.
      await startApp("https://127.0.0.1:9");
      const failed=await upload("a",fixture.siteA,await imageInput(150,110));
      assert.equal(failed.status,503,"A failed object write must not return upload success");
    } finally { await stopApp(); await startApp(); }
    const pending=await query("select id,bytes,object_key from website_media where website_id=$1 and status='pending'",[fixture.siteA]);
    const addition=pending.filter((x)=>!known.has(x.id));
    assert.equal(addition.length,1,"One unresolved write must retain one pending row");
    const failed=addition[0];
    assert(failed.object_key.startsWith("os/"+fixture.orgA+"/"+fixture.siteA+"/"));
    const during=await only("select reserved_bytes from media_storage_budget where product='lucia-os'");
    assert.equal(Number(during.reserved_bytes),Number(before.reserved_bytes)+Number(failed.bytes));
    const head=await signHead(failed.object_key);
    assert.equal(head.status,404,"Unreachable storage request must not have written a real IDrive object");
    await query("update website_media set created_at=now()-interval '25 hours' where id=$1 and status='pending'",[failed.id]);
    await expectStatus(api("a","/api/websites/"+fixture.siteA+"/media?id="+failed.id,"DELETE"),200,
      "Authorized stale pending reservation recovery");
    const refunded=await only("select reserved_bytes from media_storage_budget where product='lucia-os'");
    assert.equal(Number(refunded.reserved_bytes),Number(before.reserved_bytes));
    await query("delete from website_media where id=$1 and status='deleted'",[failed.id]);
    result.outageRecovery="PASS_SIMULATED_TRANSPORT_FAILURE_NOT_PROVIDER_OUTAGE";
  });
} catch (error) {
  result.failure = error instanceof Error ? error.message.slice(0,240) : "Unknown acceptance failure";
  process.exitCode=1;
} finally {
  try {
    if (admin && fixture) {
      result.cleanup=await cleanup();
      if (result.cleanup!=="PASS_APP_DELETION_AND_S3_404") process.exitCode=1;
    }
  } catch { result.cleanup="FAILED_OR_UNCERTAIN_RETAIN_OBJECTS";process.exitCode=1; }
  if (child) child.kill();
  if (runtime) await runtime.end().catch(()=>{});
  if (admin) await admin.end().catch(()=>{});
  const status = (name) => result.tests.find((test) => test.name === name)?.status || "NOT_RUN";
  result.acceptance = {
    providerUpload:status("authenticated-real-png-to-idrive-and-metadata"),
    imageCompression:status("authenticated-real-png-to-idrive-and-metadata"),
    storedObjectSizeBytes:result.storedObjectBytes ?? null,
    databaseOwnership:status("authenticated-real-png-to-idrive-and-metadata"),
    mediaLibrary:status("media-library-visibility-and-byte-accounting"),
    draftSaveReload:status("tenant-guarded-layout-and-section-save-reload"),
    privatePreview:status("private-studio-preview-with-real-image"),
    publicPublication:status("public-publish-and-real-provider-image-delivery"),
    imageReplacement:status("real-replacement-and-publish-reversion"),
    priorCompositionRepublish:result.publishingReversion || "NOT_RUN",
    historicalV2RevisionRollback:result.historicalV2Rollback,
    crossTenantAndAuth:status("cross-tenant-private-read-delete-and-auth"),
    invalidImageRejection:status("spoofed-invalid-and-corrupted-image-rejection"),
    quotaConcurrency:status("atomic-concurrent-site-quota-reservation"),
    maxRetainedImages:status("200-image-boundary-with-isolated-pending-reservations"),
    twoGigabyteBudget:status("two-gigabyte-product-budget-guard_without_large_upload"),
    storageFailureAndRecovery:status("storage-transport-outage-pending-reservation-and-recovery"),
    deletionSafety:status("reference-aware-published-image-delete-denial"),
    unreferencedDeletion:status("unreferenced-object-delete-and-accounting"),
    credentialScope:result.credentialScope,
    cleanup:result.cleanup
  };
  result.verified= !process.exitCode && result.testsFailed===0 && result.cleanup==="PASS_APP_DELETION_AND_S3_404"
    && result.historicalV2Rollback==="PASS_FULL_COMPOSITION_RESTORED_DRAFT_ONLY"
    && result.credentialScope==="VERIFIED_LIST_AND_WRITE";
  // Never claim the two missing gates are proven by a passing smoke test.
  await mkdir("artifacts/phase15-live-storage",{recursive:true});
  await writeFile(artifact,JSON.stringify(result,null,2));
  console.log("Live IDrive tests:",result.testsPassed,"passed;",result.testsFailed,"failed; cleanup",result.cleanup);
  console.log(result.verified ? "LIVE STORAGE FULLY VERIFIED" : "LIVE STORAGE NOT FULLY VERIFIED");
  if(!result.verified) process.exitCode=1;
}
