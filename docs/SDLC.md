# IAMTS — System Development Life Cycle (SDLC)

**Project:** ICT Assets Maintenance & Tracking System (IAMTS)

This document demonstrates the application of the **System Development Life
Cycle** to the IAMTS project (CSC 392 – Application Development). The project
was conceived as a response to an observed problem during a Student Industrial
Work Experience Scheme (SIWES) placement at the ICT department.

---

## 0. Problem Statement

During the SIWES attachment it was observed that ICT asset tracking and
maintenance were handled manually (paper registers and spreadsheets). This
led to:

- difficulty locating which staff members had which assets;
- no clear record of when equipment entered or left maintenance;
- a slow, unaccountable process for reporting and resolving breakdowns;
- no audit trail for who issued, returned, or worked on an asset.

IAMTS was built to automate this record-keeping using a relational database
management system (DBMS) and a web application.

---

## 1. Phases of the SDLC

The project followed the **Waterfall-style SDLC** with iterative testing:

| Phase          | Activities Performed                                                        | Deliverable                                      |
|----------------|-----------------------------------------------------------------------------|--------------------------------------------------|
| 1. Planning    | Feasibility study; scope; requirements gathering                             | Scope & requirement list                         |
| 2. Analysis    | Functional & non-functional requirements; role definitions                   | Requirements specification                       |
| 3. Design      | ERD; database schema (3NF); UI/UX; security design                           | `docs/ERD.md`, `database/schema/*`               |
| 4. Implementation | Back-end APIs, front-end pages, database initialization                      | Working application                              |
| 5. Testing     | Security regression suite; API integration tests; manual acceptance          | `tests/*`, verified build                          |
| 6. Deployment  | `setup.bat` + `start.bat`, `.env`, LAN access, backup scripts                | Flash-drive package, backup automation           |
| 7. Maintenance | Versioned migrations, backups, documented operational work, future improvements | `docs/`, `backups/`                              |

---

## 2. Requirements

### Functional requirements
- Log in / log out, change and reset passwords.
- Manage user accounts with **Admin / Technician / Staff** roles.
- Register, update, assign, and retire ICT **assets** by category.
- Submit **maintenance requests**; track status (Pending → In Progress →
  Completed / Cancelled).
- View dashboards and **reports** (with date filters and export).
- Receive **notifications** for events (configurable per user).

### Non-functional requirements
- **Security** – bcrypt hashing, RBAC, CSRF protection, XSS encoding, Helmet
  headers, rate limiting, brute-force lockout.
- **Auditability** – every meaningful state change is recorded in `audit_log`.
- **Usability** – simple, role-appropriate interfaces.
- **Performance** – indexed queries and reported aggregates.
- **Portability** – runs on a standard Windows PC with Node.js + MySQL.

---

## 3. Roles & Access

| Role        | Capabilities                                                            |
|-------------|-------------------------------------------------------------------------|
| **Admin**   | Full control: manage users, assets, requests, reports, settings, audit  |
| **Technician** | View/update assigned maintenance jobs, mark progress/completion         |
| **Staff**   | Request maintenance for their assets, track the status of their requests|

Protected routes are enforced server-side via a role middleware
(`server/middleware/authMiddleware.js`) — the UI alone never gates access.

---

## 4. Development Approach

- **Back-end:** Node.js + Express, MySQL via `mysql2` (parameterized queries to
  prevent SQL injection).
- **Front-end:** server-rendered HTML pages plus lightweight client-side
  JavaScript (no heavy framework) for a small, fast, offline-friendly package.
- **Database:** fully normalized, versioned schema + migrations
  (`database/schema/`, `database/migrations/`).
- **Version control:** Git (see repository history for phased commits).

*See `docs/ARCHITECTURE.md` for detailed stack and component layout.*

---

## 5. Testing Summary

- Automated suite under `tests/` covering: authentication, CSRF, rate
  limiting/lockout, role-based access control, asset and maintenance flows,
  audit logging, and client-side output encoding (XSS).
- Manual acceptance tested against a live MySQL 8.0 instance.
- See `README.md` for how to run the suite.

---

## 6. Deployment

1. Install Node.js v20+ and MySQL 5.7+/8.0+.
2. `copy .env.example .env`, set DB credentials and `SESSION_SECRET`.
3. `npm install`, then `node database/init.js --seed`.
4. `node server/app.js` (or double-click `start.bat`).
5. The server binds to `0.0.0.0` so other machines on the LAN can connect.

---

## 7. Maintenance & Remaining Operational Work

The application now protects against self-deactivation, last-Admin
deactivation, and reuse of current or recent passwords. Remaining operational
work includes:

- a persistent production session store;
- a real password-reset mail transport;
- isolated test-database execution;
- optional barcode/QR scanning for asset lifecycle;
- an enhanced visual dashboard.

---

## 8. Conclusion

IAMTS demonstrates the full SDLC from problem analysis through design,
implementation, testing, and deployment. It solves a real, observed problem
with a secure, functional, and extensible system suitable for presentation
and defense.
