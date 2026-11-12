/** Isolated integration runner. Never accepts the application's normal database variables. */
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import postgres from "postgres";
const adminUrl = process.env.SETTINGS_TEST_ADMIN_URL;
const runtimeUrl = process.env.SETTINGS_TEST_RUNTIME_URL;
if (!adminUrl || !runtimeUrl)
  throw Error(
    "Provide SETTINGS_TEST_ADMIN_URL and SETTINGS_TEST_RUNTIME_URL for an isolated migrated acceptance database.",
  );
const adminTarget = new URL(adminUrl),
  runtimeTarget = new URL(runtimeUrl);
if (
  adminTarget.pathname !== runtimeTarget.pathname ||
  !adminTarget.pathname.endsWith("_acceptance")
)
  throw Error(
    "Both connections must target the same explicitly named *_acceptance database.",
  );
const admin = postgres(adminUrl, { max: 2, prepare: false }),
  db = postgres(runtimeUrl, { max: 2, prepare: false });
const reserve = net.createServer();
await new Promise((r) => reserve.listen(0, "127.0.0.1", r));
const port = reserve.address().port;
await new Promise((r) => reserve.close(r));
const base = `http://127.0.0.1:${port}`;
let child;
let logs = "";
const a = randomUUID(),
  b = randomUUID(),
  orgA = randomUUID(),
  orgB = randomUUID();
const tokens = {
  a: randomBytes(32).toString("hex"),
  b: randomBytes(32).toString("hex"),
};
async function api(who, method = "GET", body, extra = {}) {
  return fetch(base + "/api/workspace/preferences", {
    method,
    headers: {
      ...(who ? { cookie: `lucia_os_session=${tokens[who]}` } : {}),
      ...(method === "PUT"
        ? { "Content-Type": "application/json", origin: base }
        : {}),
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
try {
  const [role] =
    await db`SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
  assert(
    !role.rolsuper && !role.rolbypassrls,
    "Use a non-superuser NOBYPASSRLS runtime test role",
  );
  await admin.begin(async (tx) => {
    await tx`INSERT INTO app_users(id,core_subject_id,display_name) VALUES(${a},${"settings-test-" + a},'Settings Acceptance A'),(${b},${"settings-test-" + b},'Settings Acceptance B')`;
    await tx`INSERT INTO organizations(id,name,slug) VALUES(${orgA},'Settings Acceptance A',${"settings-" + orgA}),(${orgB},'Settings Acceptance B',${"settings-" + orgB})`;
    await tx`INSERT INTO organization_memberships(organization_id,user_id,role,status) VALUES(${orgA},${a},'owner','active'),(${orgB},${b},'owner','active')`;
    for (const [who, user] of [
      ["a", a],
      ["b", b],
    ])
      await tx`INSERT INTO app_sessions(user_id,token_hash,expires_at) VALUES(${user},${createHash("sha256").update(tokens[who]).digest("hex")},now()+interval '1 hour')`;
  });
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        DATABASE_URL_RUNTIME: runtimeUrl,
        APP_BASE_URL: base,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (d) => (logs += d));
  child.stderr.on("data", (d) => (logs += d));
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      if (child.exitCode !== null) throw Error(logs);
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  assert.equal((await api(null)).status, 401);
  assert.equal((await api(null, "PUT", {})).status, 401);
  const p = await (await api("a")).json();
  assert.equal(p.revision, 0);
  assert.equal(p.preferences.theme, "system");
  let res = await api("a", "PUT", {
    preferences: {
      ...p.preferences,
      theme: "dark",
      preferredOrganizationId: orgA,
    },
    revision: 0,
  });
  assert.equal(res.status, 200, await res.clone().text());
  const saved = await res.json();
  const other = await (await api("b")).json();
  assert.equal(other.revision, 0);
  assert.equal(other.preferences.theme, "system");
  assert.equal(
    (
      await api("b", "PUT", {
        preferences: { ...other.preferences, preferredOrganizationId: orgA },
        revision: 0,
      })
    ).status,
    403,
  );
  const concurrent = await Promise.all([
    api("a", "PUT", {
      preferences: { ...saved.preferences, wallpaper: "ocean" },
      revision: saved.revision,
    }),
    api("a", "PUT", {
      preferences: { ...saved.preferences, wallpaper: "sunset" },
      revision: saved.revision,
    }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  const current = await (await api("a")).json();
  assert.equal(
    (
      await api("a", "PUT", {
        preferences: { ...current.preferences, homeApps: ["staff"] },
        revision: current.revision,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api(
        "a",
        "PUT",
        { preferences: current.preferences, revision: current.revision },
        { origin: "https://evil.test" },
      )
    ).status,
    403,
  );
  await admin`UPDATE organization_memberships SET status='revoked' WHERE user_id=${a} AND organization_id=${orgA}`;
  assert.equal(
    (
      await api("a", "PUT", {
        preferences: current.preferences,
        revision: current.revision,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await db.begin(async (tx) => {
        await tx`select set_config('app.current_user_id',${b},true)`;
        return tx`select * from workspace_preferences where user_id=${a}`;
      })
    ).length,
    0,
  );
  try {
    await db.begin(async (tx) => {
      await tx`select set_config('app.current_user_id',${b},true)`;
      await tx`insert into workspace_preferences(user_id,preferences) values(${a},${db.json(p.preferences)})`;
    });
    assert.fail("RLS accepted a forged owner");
  } catch (e) {
    assert.match(e.message, /row-level security/);
  }
  const probe = "settings_rollback_" + randomBytes(6).toString("hex");
  try {
    await admin.begin(async (tx) => {
      await tx.unsafe(`CREATE SCHEMA ${probe}`);
      await tx.unsafe(`SET LOCAL search_path = ${probe},public`);
      for (const sql of readFileSync(
        "drizzle/0015_workspace_preferences.sql",
        "utf8",
      ).split("--> statement-breakpoint"))
        await tx.unsafe(sql);
      throw Error("ROLLBACK_PROBE");
    });
  } catch (e) {
    assert.equal(e.message, "ROLLBACK_PROBE");
  }
  assert.equal(
    (await admin`SELECT 1 FROM pg_namespace WHERE nspname=${probe}`).length,
    0,
  );
  console.log(
    "Settings integration: real session/default/save, cross-account/tenant denial, concurrent conflict, validation/CSRF, revocation, forced owner RLS and migration rollback passed.",
  );
} finally {
  child?.kill();
  await db.end();
  await admin.end();
}
