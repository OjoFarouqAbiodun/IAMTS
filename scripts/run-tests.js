// scripts/run-tests.js — one-command test runner.
//
// `npm test` is expected to "just work". The suite (tests/*.test.js) targets a
// staging IAMTS process on port 3100 that shares the project's `iamts` DB.
//
// This runner:
//   1. Reads the project's .env for DB/session config.
//   2. Spawns the real server (server/app.js) with PORT=3100 in the background.
//   3. Waits for /health to report the DB connected.
//   4. Runs the Node test runner against tests/*.test.js.
//   5. Always stops the staging server when the run finishes.
//
// IMPORTANT: the staging server shares the same `iamts` database as a running
// production server. The test suite is written to create only its own fixtures
// and delete exactly those ids, so it is non-destructive by design. Do not run
// it against a database with data you cannot afford to be temporarily touched.

const { spawn } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const ROOT = path.resolve(__dirname, "..");
const STAGE_PORT = 3100;
const HOST = process.env.DB_HOST || "localhost";

function stripTestOnlyEnv() {
  // Pass the app only the vars it needs; never leak secrets to the tests.
  const allowed = [
    "SESSION_SECRET",
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "APP_BASE_URL",
    "COOKIE_SECURE",
    "NODE_ENV",
    "PORT",
  ];
  const env = {};
  for (const k of allowed) {
    if (process.env[k] !== undefined) env[k] = process.env[k];
  }
  return env;
}

async function waitUntilReady(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  if (!process.env.SESSION_SECRET) {
    console.error("Error: SESSION_SECRET is not set in .env");
    process.exit(1);
  }

  const childEnv = { ...stripTestOnlyEnv(), PORT: String(STAGE_PORT) };

  const server = spawn(process.execPath, ["server/app.js"], {
    cwd: ROOT,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d.toString()));
  server.stderr.on("data", (d) => (serverLog += d.toString()));

  const healthUrl = `http://localhost:${STAGE_PORT}/health`;

  const ready = await waitUntilReady(healthUrl);
  if (!ready) {
    console.error("Error: staging server on " + healthUrl + " did not become ready.");
    console.error("--- server output ---\n" + serverLog);
    server.kill("SIGTERM");
    process.exit(1);
  }

  const testArgs = ["--test", "--test-concurrency=1", "tests/*.test.js"];
  const testPath = path.join(ROOT, "tests");

  const tester = spawn(process.execPath, testArgs, {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });

  tester.on("close", (code) => {
    server.kill("SIGTERM");
    // Give the server a moment to shut down, then force if needed.
    setTimeout(() => {
      if (!server.killed) server.kill("SIGKILL");
      process.exit(code === null ? 1 : code);
    }, 1500);
  });
}

main().catch((err) => {
  console.error("Unexpected runner error:", err);
  process.exit(1);
});
