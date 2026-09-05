# IAMTS — ICT Assets Maintenance Tracking System

CSC 392 / CSC 394 University Project

## 🎓 Project Documentation

- **`docs/ERD.md`** – database design, entity relationships, and sample queries (CSC 394)
- **`docs/SDLC.md`** – system development life cycle write-up (CSC 392)
- **`docs/ARCHITECTURE.md`** – tech stack, component layout, and security controls

## Prerequisites

- **Node.js** v20+ (verified with v24.19.0)
- **MySQL** 5.7+ or 8.0+ (verified with MySQL 8.0.42)
- **npm** (bundled with Node.js)

## Quick Start

### Option A: Automated (Windows)

1. Run **`setup.bat`** — creates the database, tables, and initial Admin account
2. Run **`start.bat`** — starts the server and opens the browser

### Option B: Manual

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env
# Edit .env with your MySQL credentials. Generate SESSION_SECRET with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Initialize database
node database/init.js          # schema + Admin only (production)
node database/init.js --seed   # schema + Admin + demonstration data

# 4. Start server
node server/app.js
```

### Generating a Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `SESSION_SECRET` in your `.env` file.

## Default Credentials

| Role   | Email                    | Password     |
|--------|--------------------------|--------------|
| Admin  | kalagbala@iamts.com      | Password123! |

> Change the Admin password immediately in production.

## Accessing from Other Computers (LAN)

The server binds to `0.0.0.0` by default. Find your LAN IP:

```bash
ipconfig
```

Other computers on the same network can access:

```
http://<YOUR_LAN_IP>:3000
```

No CORS configuration is needed — the application uses relative URLs and same-origin cookies.

## File Structure

```
iamts/
├── client/                    # Frontend HTML + CSS + JS
│   ├── assets/
│   │   ├── css/               # Application stylesheets
│   │   ├── js/                # Client-side JavaScript
│   │   └── vendor/
│   │       └── fontawesome/   # Self-hosted Font Awesome 6.7.2
│   └── *.html                 # Client pages
├── server/                    # Express backend
│   ├── app.js                 # Entry point (middleware, routes, shutdown)
│   ├── config/db.js           # MySQL connection pool
│   ├── controllers/           # Route handlers
│   ├── middleware/             # Security middleware (CSRF, auth, etc.)
│   ├── models/                # Database models
│   └── views/                 # Admin-only server-rendered pages
├── database/
│   ├── init.js                # Database initialization script
│   ├── schema/                # Base table definitions (02-07)
│   ├── migrations/            # Incremental schema changes (002-007)
│   ├── seed/                  # Demonstration data
│   └── patch/                 # Utility scripts
├── docs/                      # ERD, SDLC and architecture documentation
├── scripts/                   # Utility scripts (test runner)
├── tests/                     # Security regression suite (66 tests)
├── backups/                   # Database backup scripts
├── setup.bat                  # Windows: database setup
├── start.bat                  # Windows: launch server
├── .env.example               # Environment template
├── .env                       # Your environment config (not in repo)
└── package.json
```

## API Endpoints

| Method | Path                    | Auth     | Description                     |
|--------|-------------------------|----------|---------------------------------|
| POST   | /login                  | None     | Authenticate and create session |
| POST   | /logout                 | Any      | Destroy session                 |
| GET    | /me                     | Any      | Current user profile            |
| POST   | /change-password        | Any      | Change own password             |
| POST   | /reset-password-request | None     | Request password reset email    |
| POST   | /reset-password         | None     | Reset with token                |
| GET    | /health                 | None     | Server + database health check  |
| GET    | /api/assets             | Admin    | List all assets                 |
| POST   | /api/assets             | Admin    | Create asset                    |
| PUT    | /api/assets/:id         | Admin    | Update asset                    |
| DELETE | /api/assets/:id         | Admin    | Delete asset                    |
| GET    | /api/maintenance        | Any      | List maintenance records        |
| POST   | /api/maintenance        | Any      | Create maintenance request      |
| PUT    | /api/maintenance/:id    | Any      | Update maintenance record       |
| GET    | /api/users              | Admin    | List users                      |
| POST   | /users                  | Admin    | Create user                     |
| PUT    | /users/:id              | Admin    | Update user                     |
| PUT    | /users/:id/status       | Admin    | Activate/deactivate user        |

## Security Controls

| ID  | Control                              | Status   |
|-----|--------------------------------------|----------|
| G1  | bcrypt password hashing (10 rounds)  | Implemented |
| G2  | Role-based authorization             | Implemented |
| G3  | CSRF protection (double-submit cookie)| Implemented |
| G4  | XSS output encoding (HTML entities) | Implemented |
| G5  | Last-admin / self-deactivation guard | Implemented |
| G6  | Rate limiting on login               | Implemented |
| G7  | Brute-force lockout (5 failures/15m) | Implemented |
| G8  | Session fixation prevention          | Implemented |
| G9  | HTTP security headers (Helmet)       | Implemented |
| G10 | Password-reuse prevention            | Implemented |

## Testing

```bash
npm test
# or
node --test --test-concurrency=1 tests/*.test.js
```

`npm test` runs a wrapper (`scripts/run-tests.js`) that starts a staging server
on port **3100**, waits for it to be ready, runs the suite, and shuts it down
automatically. The staging server shares the project `iamts` database; the
suite creates and cleans up only its own fixtures. Don't run it against a
database with data you can't afford to be temporarily touched.

Tests require the staging server running on port 3100.

## Remaining Operational Work

- Configure a persistent session store before production or multi-instance use.
- Configure a real password-reset mail transport; the development fallback does
	not log reset URLs.
- Run automated tests against a dedicated test database rather than a shared
	operational database.

## License

Academic project — not for production use.
