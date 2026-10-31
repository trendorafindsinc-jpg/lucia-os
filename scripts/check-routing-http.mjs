import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const reservation=net.createServer();
await new Promise(resolve=>reservation.listen(0,"127.0.0.1",resolve));
const port=reservation.address().port;
await new Promise(resolve=>reservation.close(resolve));
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{
  // No customer database is used: these checks exercise compiled hostname routing and fail-closed rendering.
  env:{...process.env,NODE_ENV:"production",VERCEL_ENV:"production",APP_BASE_URL:"https://os.lucia.name.ng",LUCIA_SITE_DOMAIN:"lucia.name.ng",DATABASE_URL:"",DATABASE_URL_RUNTIME:""},
  stdio:["ignore","pipe","pipe"],
});
let logs="";
child.stdout.on("data",chunk=>logs+=chunk);
child.stderr.on("data",chunk=>logs+=chunk);
function request(host,path="/",extraHeaders={}) {
  return new Promise((resolve,reject)=>{
    const req=http.get({hostname:"127.0.0.1",port,path,headers:{host,...extraHeaders}},response=>{
      let body="";response.setEncoding("utf8");response.on("data",part=>body+=part);
      response.on("end",()=>resolve({status:response.statusCode,headers:response.headers,body}));
    });
    req.setTimeout(10000,()=>req.destroy(new Error("HTTP routing check timed out")));
    req.on("error",reject);
  });
}
try {
  let platform;
  for(let i=0;i<100;i++) {
    try {platform=await request("os.lucia.name.ng");break;} catch {if(child.exitCode!==null)throw new Error(logs);await delay(200);}
  }
  assert(platform,"Production server did not start");
  assert.equal(platform.status,200);
  assert.match(platform.body,/Your vision deserves/);
  const settings=await request("os.lucia.name.ng","/workspace/settings");
  assert.equal(settings.status,200);
  assert.match(settings.body,/Sign in to open Settings/);
  const cataloguePreview=await request("os.lucia.name.ng","/templates/preview/lucia.layout.haven");
  assert.equal(cataloguePreview.status,307,"Canonical previews require LUCIA ID");
  assert.match(cataloguePreview.headers.location,/^\/api\/auth\/login\?returnTo=/);
  const preferences=await request("os.lucia.name.ng","/api/workspace/preferences");
  assert.equal(preferences.status,401);
  const desktop=await request("os.lucia.name.ng","/workspace/desktop");
  assert.equal(desktop.status,200);
  assert.match(desktop.body,/Sign in to open Lattice/);
  assert.doesNotMatch(desktop.body,/Website name/);
  for(const [host,path] of [
    ["ores-agric.lucia.name.ng","/"],
    ["northstar.lucia.name.ng","/about"],
    ["staff.lucia.name.ng","/"],
    ["nested.school.lucia.name.ng","/"],
    ["customer-example.com","/"],
    ["northstar.lucia.name.ng","/api/auth/me"],
    ["customer-example.com","/api/auth/login"],
    ["northstar.lucia.name.ng","/site/other"],
    ["northstar.lucia.name.ng","/tenant-site-internal"],
    ["northstar.lucia.name.ng","/staff"],
    ["northstar.lucia.name.ng","/workspace/desktop"],
    ["northstar.lucia.name.ng","/workspace/settings"],
    ["northstar.lucia.name.ng","/templates/preview/lucia.layout.haven"],
    ["customer-example.com","/workspace/settings"],
    ["customer-example.com","/api/workspace/preferences"],
  ]) {
    const response=await request(host,path);
    assert.equal(response.status,404,`${host}${path} must fail closed without a published site`);
    assert.doesNotMatch(response.body,/Your vision deserves/,`${host}${path} must never render the platform landing page`);
    assert.equal(response.headers.location,undefined,"Customer routing must not redirect to the platform");
  }
  const caseId="b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
  for (const path of [`/api/staff/support/cases/${caseId}`, `/api/staff/support/cases/${caseId}/messages`, `/api/support/cases/${caseId}`, `/api/support/cases/${caseId}/messages`]) {
    const response = await request("os.lucia.name.ng", path);
    assert.equal(response.status, 401, `${path} requires authentication`);
    assert.match(response.body, /Authentication required/);
  }
  for (const path of ["/staff", "/staff/support", "/staff/team", "/staff/audit", "/staff/organisations", `/staff/support/${caseId}`]) {
    const response = await request("os.lucia.name.ng", path);
    assert.equal(response.status, 200, `${path} renders a truthful access gate`);
    assert.doesNotMatch(response.body, /role="tablist"/, `${path} must not render customer tabs`);
    assert.doesNotMatch(response.body, /href="\/workspace"/, `${path} must not include customer launcher navigation`);
  }
  const spoof=await request("northstar.lucia.name.ng","/api/auth/me",{"x-forwarded-host":"os.lucia.name.ng"});
  assert.equal(spoof.status,404,"Forwarded-host must not bypass tenant routing");
  const asset=platform.body.match(/src="([^\"]+\/_next\/static\/[^\"]+)"/)?.[1] || platform.body.match(/src="(\/_next\/static\/[^\"]+)"/)?.[1];
  assert(asset,"Platform HTML must reference a generated static asset");
  assert.equal((await request("northstar.lucia.name.ng",asset)).status,200,"Shared static assets remain reachable on tenant hosts");
  console.log("Compiled production server: platform, tenant, custom-domain, private-path, staff/customer access gates, spoofing and static-asset checks passed.");
} finally {
  child.kill("SIGTERM");
  await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once("exit",resolve);});
}
