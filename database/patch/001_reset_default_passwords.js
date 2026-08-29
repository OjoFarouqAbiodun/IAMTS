require("dotenv").config();
const bcrypt = require("bcrypt");
const mysql = require("mysql2");

const DEFAULT_PASSWORD = "Password123!";

const accounts = [
  { email: "kalagbala@iamts.com", role: "Admin" },
  { email: "sadebayo@iamts.com", role: "Technician" },
  { email: "oadeyemi@iamts.com", role: "Technician" },
  { email: "aogunleye@iamts.com", role: "Staff" },
  { email: "toladipo@iamts.com", role: "Staff" },
  { email: "dakinola@iamts.com", role: "Staff" },
  { email: "sbankole@iamts.com", role: "Staff" },
];

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
}).promise();

async function run() {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let updated = 0;
  for (const acc of accounts) {
    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ? AND role = ?",
      [hash, acc.email, acc.role],
    );
    updated += result.affectedRows;
    console.log(
      `[PATCH] ${acc.role.padEnd(10)} ${acc.email.padEnd(30)} ${
        result.affectedRows ? "OK" : "NOT FOUND"
      }`,
    );
  }

  const [rows] = await db.query(
    "SELECT id, email, role, status, LEFT(password, 7) AS prefix FROM users WHERE email IN (?) ORDER BY id",
    [accounts.map((a) => a.email)],
  );

  for (const row of rows) {
    const [pwRows] = await db.query("SELECT password FROM users WHERE id = ?", [row.id]);
    const match = await bcrypt.compare(DEFAULT_PASSWORD, pwRows[0].password);
    console.log(
      `[VERIFY] id=${row.id} ${row.role.padEnd(10)} ${row.email.padEnd(30)} status=${row.status} bcrypt.compare -> ${match}`,
    );
  }

  console.log(`\n[PATCH] ${updated} account(s) updated to default password.`);
}

run()
  .catch((err) => {
    console.error("[PATCH] Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
