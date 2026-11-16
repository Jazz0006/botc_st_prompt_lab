#!/usr/bin/env node
// Build and deploy the Prompt Lab to your own Cloudflare account, behind
// Cloudflare Access. The OpenAI Sites deployment is unaffected.
//
//   node scripts/deploy-cloudflare.mjs migrate          # apply drizzle/*.sql to remote D1 (tracked, idempotent)
//   node scripts/deploy-cloudflare.mjs deploy           # build the Access-gated entry and deploy the Worker
//   node scripts/deploy-cloudflare.mjs migrate deploy   # both, one build
//
// Needs CLOUDFLARE_ACCOUNT_ID. Sign in with `pnpm exec wrangler login` on your own
// computer, or set CLOUDFLARE_API_TOKEN (CI).
// Settings (non-secret) live in deploy/cloudflare.json.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const commands = process.argv.slice(2);
if (!commands.length || commands.some((c) => !["migrate", "deploy"].includes(c))) {
  console.error("Usage: node scripts/deploy-cloudflare.mjs <migrate|deploy> [deploy]");
  process.exit(64);
}
if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  console.error("CLOUDFLARE_ACCOUNT_ID is required.");
  process.exit(64);
}

const settings = JSON.parse(readFileSync("deploy/cloudflare.json", "utf8"));
const run = (cmd, args, env = {}) => {
  // Windows resolves pnpm only through the shell (pnpm.cmd).
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("pnpm", ["run", "build"], { PROMPT_LAB_TARGET: "cloudflare" });

const generated = JSON.parse(readFileSync("dist/server/wrangler.json", "utf8"));
const config = {
  ...generated,
  name: settings.workerName,
  account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
  workers_dev: true,
  preview_urls: false,
  d1_databases: [{
    binding: "DB",
    database_name: settings.d1DatabaseName,
    database_id: settings.d1DatabaseId,
    migrations_dir: "../../drizzle",
  }],
  vars: {
    ...(generated.vars ?? {}),
    ACCESS_TEAM_DOMAIN: settings.accessTeamDomain ?? "",
    ACCESS_AUD: settings.accessAud ?? "",
  },
};
// Written next to the generated file so its relative paths keep working.
const configPath = "dist/server/wrangler.cloudflare.json";
writeFileSync(configPath, JSON.stringify(config, null, 2));

const wrangler = ["exec", "wrangler"];
if (commands.includes("migrate")) {
  run("pnpm", [...wrangler, "d1", "migrations", "apply", "DB", "--remote", "--config", configPath]);
}
if (commands.includes("deploy")) {
  if (!settings.accessTeamDomain || !settings.accessAud) {
    console.warn("Access team domain / AUD not set: the deployed Worker will refuse every request (fail closed).");
  }
  run("pnpm", [...wrangler, "deploy", "--config", configPath]);
}
