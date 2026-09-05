# IAMTS — System Architecture

**Project:** ICT Assets Maintenance & Tracking System (IAMTS)

---

## 1. Technology Stack

| Layer        | Technology                                             |
|--------------|--------------------------------------------------------|
| Front-end    | HTML5, CSS3, vanilla JavaScript, Font Awesome (self-hosted) |
| Back-end     | Node.js (v20+), Express 5                               |
| Database     | MySQL 5.7 / 8.0 (`mysql2` driver)                       |
| Sessions     | `express-session` (in-memory for demo; replaceable)     |
| Security     | Helmet, bcrypt, CSRF double-submit cookie, rate limiting |
| Testing      | Node built-in test runner (`node --test`)               |
| Tooling      | npm, `nodemon` (dev), Git                               |

---

## 2. High-Level Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│  Browser (Client)   │  HTTP  │  Express Server       │
│  HTML/CSS/JS pages  │ ─────► │  server/app.js        │
│  client/, views/    │        │  (middleware stack)   │
└─────────────────────┘        └──────────┬───────────┘
                                          │
                                          ▼
                              ┌──────────────────────┐
                              │  Controller layer     │
                              │  server/controllers/  │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │  Model / data layer   │
                              │  server/models/*.js   │
                              └──────────┬───────────┘
                                         │  mysql2 (parameterized)
                                         ▼
                              ┌──────────────────────┐
                              │  MySQL database       │
                              │  (iamts)              │
                              └──────────────────────┘
```

### Request flow (example: create maintenance request)
1. Staff submits `/api/maintenance` with a CSRF token.
2. `ensureCsrfCookie` + `csrfProtect` verify the token.
3. Route → `maintenanceController` → input validation.
4. Model runs a parameterized `INSERT` and updates the affected asset status.
5. Audit log records the action; a notification is created for relevant users.
6. JSON response returns to the client, which shows a toast.

---

## 3. Directory Structure

```
iamts/
├── client/                 # Public front-end
│   ├── *.html              # Client pages
│   └── assets/
│       ├── css/            # Styles (tokens, base, components, dashboard, reports)
│       ├── js/             # Client-side scripts (api, auth, reports, …)
│       ├── images/         # Logos
│       └── vendor/         # Self-hosted Font Awesome
├── server/                 # Express back-end
│   ├── app.js              # Entry point, middleware, routes, shutdown
│   ├── config/db.js        # MySQL connection pool
│   ├── controllers/        # Route handlers
│   ├── middleware/         # auth, CSRF
│   ├── models/             # Data access layer
│   ├── routes/             # Route definitions
│   ├── services/           # e.g. email service
│   ├── utils/              # validators, maintenance transitions
│   └── views/              # Admin-only server-rendered pages
├── database/
│   ├── init.js             # Idempotent DB initializer
│   ├── schema/             # Base tables
│   ├── migrations/         # Incremental schema changes
│   ├── seed/               # Demonstration data
│   └── patch/              # Utility scripts
├── docs/                   # ERD, SDLC, architecture (this file)
├── tests/                  # Automated test suite
├── backups/                # Database dump scripts
├── setup.bat / start.bat   # Windows launchers
└── .env / .env.example     # Configuration
```

---

## 4. Security Controls

| ID  | Control                                  | Implementation                                             |
|-----|------------------------------------------|------------------------------------------------------------|
| G1  | Password hashing                         | bcrypt, 10 rounds (`users.password`)                       |
| G2  | Role-based authorization                 | `checkRole(...)` middleware                                 |
| G3  | CSRF protection                          | double-submit cookie (`csrfMiddleware.js`)                  |
| G4  | XSS output encoding                      | HTML-entity escaping of user data on render                 |
| G7  | Brute-force lockout                      | 5 failed logins → 15-minute lockout                         |
| G8  | Session fixation prevention              | rotate session id on login                                  |
| G9  | HTTP security headers                    | Helmet                                                      |
|     | SQL injection protection                 | parameterized queries (`mysql2` `?` placeholders)           |
|     | Reset-token security                     | tokens stored as SHA-256 hash, single-use, 30-min expiry    |
|     | Auditability                             | append-only `audit_log`                                     |

See `README.md` for the full control list and remaining operational work.

---

## 5. Reporting & Export

- The reports API (`/reports/data`) aggregates asset summaries, maintenance
  status counts, priority splits, technician workload, and recent activity
  over a selectable date range (today / week / month / custom).
- The Reports page renders these as summary cards, a donut chart, bar charts,
  and tables, and supports **CSV / Excel export** and **Print / PDF**.

---

## 6. Configuration (`.env`)

| Variable          | Purpose                                              |
|-------------------|------------------------------------------------------|
| `SESSION_SECRET`  | Session signing secret (required)                    |
| `DB_HOST/PORT/USER/PASSWORD/NAME` | MySQL connection                    |
| `APP_BASE_URL`    | Base URL for links/emails                            |
| `COOKIE_SECURE`   | Require HTTPS for cookies (prod)                     |
| `NODE_ENV`        | `development` / `production`                         |
| `AUDIT_LOG_ENABLED`| Toggle audit writes                                 |
| `AUDIT_RETENTION_DAYS` | Audit retention window (default 180 days)      |

> Never commit `.env`; keep secrets out of version control.
