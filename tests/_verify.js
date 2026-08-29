const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const p = mysql.createPool({
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dateStrings: true,
  });

  const tables = [
    "users", "assets", "asset_assignments", "maintenance",
    "password_resets", "notifications", "audit_log", "user_preferences",
  ];
  for (const t of tables) {
    const [r] = await p.query("SELECT COUNT(*) AS n FROM `" + t + "`");
    console.log(t + ": " + r[0].n);
  }

  const [u] = await p.query(
    "SELECT id, email FROM users WHERE email LIKE ?",
    ["s11-%@iamts.test"]
  );
  console.log("\nOrphaned test users: " + u.length);
  if (u.length > 0) console.log(JSON.stringify(u));

  const [a] = await p.query(
    "SELECT id, asset_tag FROM assets WHERE asset_tag LIKE ?",
    ["S11-%"]
  );
  console.log("Orphaned test assets: " + a.length);
  if (a.length > 0) console.log(JSON.stringify(a));

  const [m] = await p.query(
    "SELECT id, problem_title FROM maintenance WHERE problem_title LIKE ?",
    ["S11%"]
  );
  console.log("Orphaned test maintenance: " + m.length);
  if (m.length > 0) console.log(JSON.stringify(m));

  await p.end();
})();
