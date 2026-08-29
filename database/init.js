#!/usr/bin/env node
// database/init.js — IAMTS Database Initialization
//
// Usage:
//   node database/init.js              Initialize schema + Admin only (production-safe)
//   node database/init.js --seed       Initialize schema + Admin + demonstration data
//
// This script:
//   1. Creates the iamts database if it does not exist (NEVER drops it)
//   2. Creates all required tables (schema 02-07 + migrations 002-007)
//   3. Bootstraps the initial Admin account with a bcrypt-hashed password
//   4. Optionally seeds demonstration data (--seed flag)
//
// Safe to run multiple times (idempotent).

require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const BCRYPT_ROUNDS = 10;
const DB_NAME = process.env.DB_NAME || "iamts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`  ${msg}`);
}

function ok(msg) {
  console.log(`  [OK] ${msg}`);
}

function skip(msg) {
  console.log(`  [SKIP] ${msg}`);
}

function fail(msg) {
  console.error(`  [FAIL] ${msg}`);
}

/** Read a SQL file, strip line comments, and split into individual statements. */
function readSql(relativePath) {
  const abs = path.join(__dirname, relativePath);
  const raw = fs.readFileSync(abs, "utf8");
  // Strip SQL line comments BEFORE splitting on semicolons
  const stripped = raw.replace(/--.*$/gm, "");
  return stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Execute an array of SQL statements sequentially. Returns count executed. */
async function execStatements(conn, statements, label) {
  let count = 0;
  for (const sql of statements) {
    try {
      await conn.query(sql);
      count++;
    } catch (err) {
      // Ignore "table/column already exists" errors for idempotency
      if (err.code === "ER_TABLE_EXISTS_ERROR" || err.code === "ER_DUP_ENTRY") {
        // silently skip — idempotent
      } else if (err.code === "ER_DUP_KEYNAME" || err.code === "ER_DUP_FIELDNAME") {
        // index or column already exists — skip
      } else if (err.code === "ER_BAD_FIELD_ERROR") {
        // column already renamed/removed — skip (e.g. migration 006 re-run)
      } else {
        fail(`${label}: ${err.message}`);
        throw err;
      }
    }
  }
  return count;
}

/** Prompt the user for input via readline. */
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const useSeed = process.argv.includes("--seed");

  console.log("\n========================================");
  console.log("  IAMTS Database Initialization");
  console.log("========================================\n");

  // --- Step 1: Connect to MySQL (no database selected) ---
  log("Connecting to MySQL...");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  ok("Connected to MySQL");

  // --- Step 2: Create database if not exists ---
  log(`Creating database "${DB_NAME}" if not exists...`);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.query(`USE \`${DB_NAME}\``);
  ok(`Database "${DB_NAME}" ready`);

  // --- Step 3: Schema (02-07) ---
  console.log("\n--- Schema ---");
  const schemaFiles = [
    "schema/02_users.sql",
    "schema/03_asset_categories.sql",
    "schema/04_assets.sql",
    "schema/05_asset_assignments.sql",
    "schema/06_maintenance.sql",
    "schema/07_notifications.sql",
  ];
  for (const file of schemaFiles) {
    const stmts = readSql(file);
    const n = await execStatements(conn, stmts, file);
    ok(`${file} — ${n} statement(s)`);
  }

  // --- Step 4: Migrations (skip 001 — already in schema) ---
  console.log("\n--- Migrations ---");
  skip("001_add_cancelled_status.sql — already incorporated into base schema");

  const migrationFiles = [
    "migrations/002_add_user_preferences.sql",
    "migrations/003_update_status_enums.sql",
    "migrations/004_add_role_preference_flags.sql",
    "migrations/005_create_password_resets.sql",
    "migrations/006_rename_password_resets_token_hash.sql",
    "migrations/007_create_audit_log.sql",
  ];
  for (const file of migrationFiles) {
    const stmts = readSql(file);
    const n = await execStatements(conn, stmts, file);
    ok(`${file} — ${n} statement(s)`);
  }

  // --- Step 5: Admin bootstrap ---
  console.log("\n--- Admin Bootstrap ---");
  const [existingAdmins] = await conn.query(
    "SELECT id, email FROM users WHERE role = 'Admin' LIMIT 1"
  );

  if (existingAdmins.length > 0) {
    skip(
      `Admin already exists (${existingAdmins[0].email}) — bootstrap skipped`
    );
  } else {
    // Try environment variables first, fall back to interactive prompt
    let adminName = process.env.ADMIN_NAME || "";
    let adminEmail = process.env.ADMIN_EMAIL || "";
    let adminPassword = process.env.ADMIN_PASSWORD || "";
    let adminDepartment = process.env.ADMIN_DEPARTMENT || "";

    if (!adminEmail || !adminPassword) {
      // Interactive mode
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log("\n  No Admin found. Creating initial Admin account.\n");

      if (!adminName) {
        adminName = await prompt(rl, "  Admin full name: ");
      }
      if (!adminEmail) {
        adminEmail = await prompt(rl, "  Admin email: ");
      }
      if (!adminDepartment) {
        adminDepartment = await prompt(rl, "  Admin department: ");
      }
      if (!adminPassword) {
        adminPassword = await prompt(rl, "  Initial password: ");
      }

      rl.close();
    }

    // Validate
    if (!adminName || !adminEmail || !adminPassword) {
      fail("Admin name, email, and password are all required.");
      process.exit(1);
    }
    if (adminPassword.length < 8) {
      fail("Password must be at least 8 characters.");
      process.exit(1);
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

    await conn.query(
      `INSERT INTO users (full_name, email, password, role, department, status)
       VALUES (?, ?, ?, 'Admin', ?, 'Active')`,
      [adminName, adminEmail, hashedPassword, adminDepartment || "ICT"]
    );
    ok(`Initial Admin created: ${adminEmail}`);
  }

  // --- Step 6: Seed demonstration data (only with --seed flag) ---
  if (useSeed) {
    console.log("\n--- Demonstration Seed Data ---");
    const seedFiles = [
      "seed/01_asset_categories.sql",
      "seed/02_users.sql",
      "seed/03_assets.sql",
      "seed/04_asset_assignments.sql",
      "seed/05_maintenance.sql",
    ];
    for (const file of seedFiles) {
      const stmts = readSql(file);
      let executed = 0;
      for (const sql of stmts) {
        try {
          await conn.query(sql);
          executed++;
        } catch (err) {
          if (err.code === "ER_DUP_ENTRY") {
            // Seed data already exists — skip silently
          } else {
            fail(`${file}: ${err.message}`);
          }
        }
      }
      ok(`${file} — ${executed} statement(s)`);
    }
  } else {
    console.log("\n--- Seed Data ---");
    skip("Demonstration data not loaded (use --seed to include)");
  }

  // --- Step 7: Verify ---
  console.log("\n--- Verification ---");
  const expectedTables = [
    "users",
    "asset_categories",
    "assets",
    "asset_assignments",
    "maintenance",
    "notifications",
    "user_preferences",
    "password_resets",
    "audit_log",
  ];
  const [tables] = await conn.query("SHOW TABLES");
  const existingNames = tables.map(
    (t) => Object.values(t)[0]
  );

  let allPresent = true;
  for (const t of expectedTables) {
    if (existingNames.includes(t)) {
      ok(`Table: ${t}`);
    } else {
      fail(`Table: ${t} — MISSING`);
      allPresent = false;
    }
  }

  const [adminRows] = await conn.query(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'Admin'"
  );
  const adminCount = adminRows[0].n;
  if (adminCount > 0) {
    ok(`Admin accounts: ${adminCount}`);
  } else {
    fail("No Admin accounts found");
    allPresent = false;
  }

  await conn.end();

  console.log("\n========================================");
  if (allPresent) {
    console.log("  Database initialization complete.");
  } else {
    console.log("  Database initialization completed with errors.");
    process.exit(1);
  }
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
