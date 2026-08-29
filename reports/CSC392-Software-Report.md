# SOFTWARE REPORT — CSC 392
## Practical Application of Software Development in Industries

**Student:** Ojo Farouq Abiodun
**Matriculation Number:** 22110591344
**Department:** Computer Science
**Institution:** Lagos State University, Ojo
**SIWES Organization:** Lagos State Ministry of Innovation, Science and Technology, Alausa-Secretariat, Ikeja, Lagos
**Industrial Supervisor:** Mr. Tola Ajagbe
**Project Title:** ICT Assets Maintenance & Tracking System (IAMTS)

---

## Table of Contents
1. Introduction
2. Problem Statement
3. Objectives
4. System Analysis
5. System Design
6. System Development Life Cycle (SDLC)
7. Implementation (Technology Stack)
8. Testing
9. Deployment and Installation
10. Sample Screens and Features
11. Security
12. Challenges and Solutions
13. Conclusion and Recommendations
14. References

---

## 1. Introduction

During my Student Industrial Work Experience Scheme (SIWES) attachment at the
ICT department of the Lagos State Ministry of Innovation, Science and
Technology, Alausa-Secretariat, Ikeja, Lagos, I observed how ICT assets such as
computers, printers, and servers were tracked and maintained. I noticed that
record-keeping was largely manual, relying on paper registers and spreadsheet
files. This made it difficult to know who had which asset, when an item went
for maintenance, and who was responsible for its repair.

The **ICT Assets Maintenance & Tracking System (IAMTS)** is a web application
developed to automate this record-keeping and to demonstrate the practical
application of software development in an industrial setting. It provides
role-based access for system administrators, maintenance technicians, and
general staff, and supports asset registration, assignment to staff, and a
maintenance request workflow.

This report presents IAMTS as the deliverable for CSC 392, following the
System Development Life Cycle (SDLC) from analysis through design,
implementation, and testing.

---

## 2. Problem Statement

The ICT department maintained its assets manually:
- Asset information was scattered across paper registers and spreadsheets.
- There was no reliable way to know which staff member had which asset.
- Maintenance requests were handled verbally or informally, with no audit trail.
- There was no clear record of when equipment entered or left maintenance.
- Reporting was slow because data had to be collated by hand.

These problems caused delay in locating assets, difficulty in accountability,
and a lack of transparency in the maintenance process. IAMTS was built to
solve these problems.

---

## 3. Objectives

The objectives of the project are to:
1. Develop a functional web application that manages ICT asset records.
2. Automate the maintenance request and tracking workflow.
3. Provide role-based access control for Admin, Technician, and Staff users.
4. Generate operational reports for the ICT team.
5. Demonstrate proper use of the System Development Life Cycle.
6. Provide a secure system with authentication, authorization, and audit logging.

---

## 4. System Analysis

### 4.1 Users and Roles
- **Admin** — full control over the system: manage users, assets, requests,
  reports, settings, and audit logs.
- **Technician** — handles maintenance jobs assigned to them, updates their
  progress, and completes jobs.
- **Staff** — requests maintenance for their assets and tracks their requests.

### 4.2 Functional Requirements
- Login, logout, change and reset passwords.
- Register, update, assign, and retire ICT assets.
- Submit maintenance requests.
- Track maintenance status (Pending → In Progress → Completed / Cancelled).
- View dashboards and reports with date filtering and export.
- Receive and manage notifications.

### 4.3 Non-Functional Requirements
- **Security** — password hashing, role-based access control, CSRF protection,
  XSS protection, rate limiting, and brute-force lockout.
- **Auditability** — an audit log records meaningful system events.
- **Usability** — simple role-appropriate interfaces.
- **Performance** — indexed database queries and aggregated reports.
- **Portability** — runs on a standard Windows PC with Node.js and MySQL.

---

## 5. System Design

### 5.1 Architecture
IAMTS uses a three-tier architecture:
- **Presentation layer:** HTML, CSS, and JavaScript pages served to the browser.
- **Application layer:** an Express (Node.js) server that exposes RESTful APIs.
- **Data layer:** a MySQL relational database accessed through parameterized queries.

### 5.2 Database Design
The database is normalized to Third Normal Form (3NF) and consists of the
following tables: `users`, `asset_categories`, `assets`, `asset_assignments`,
`maintenance`, `notifications`, `user_preferences`, `password_resets`, and
`audit_log`. A detailed entity relationship diagram is provided in the separate
**Database Report (CSC 394)**.

### 5.3 User Interface Design
The interface was designed around the needs of each role. The Admin sees
management screens (assets, users, pending requests, reports); the Technician
sees an assigned-jobs dashboard; the Staff sees a request-submission and
tracking interface. A consistent sidebar layout, status badges, and toast
notifications provide a clear and usable experience.

---

## 6. System Development Life Cycle (SDLC)

IAMTS was developed using the **Waterfall SDLC** model with an iterative
testing phase, as follows:

| Phase | Activities | Deliverable |
|-------|-----------|-------------|
| 1. Planning | Feasibility study, scope definition, requirements gathering | Scope and requirement list |
| 2. Analysis | Functional and non-functional requirements, role definition | Requirements specification |
| 3. Design | ERD, normalized schema, UI design, security design | Database schema, interface design |
| 4. Implementation | Back-end APIs, front-end pages, database initialization | Working application |
| 5. Testing | Security regression suite, integration tests, acceptance testing | Verified build |
| 6. Deployment | Setup and start scripts, environment configuration | Installable package |
| 7. Maintenance | Versioned migrations, documented gaps, backup automation | Maintained system |

The full SDLC write-up is provided in the project documentation
(`docs/SDLC.md`).

---

## 7. Implementation (Technology Stack)

| Layer | Technology |
|-------|-----------|
| Front-end | HTML5, CSS3, vanilla JavaScript, Font Awesome |
| Back-end | Node.js, Express 5 |
| Database | MySQL (via the `mysql2` driver) |
| Sessions | `express-session` |
| Security | Helmet, bcrypt, CSRF double-submit cookie, rate limiting |
| Testing | Node built-in test runner |
| Version control | Git |

### 7.1 Key Implementation Details
- **RESTful API:** routes are organized under `server/routes/` with handlers in
  `server/controllers/`.
- **Data access:** models in `server/models/` use parameterized SQL queries to
  prevent SQL injection.
- **Authentication:** passwords are hashed with bcrypt (10 rounds); sessions
  are rotated on login to prevent fixation.
- **Authorization:** a role-check middleware restricts protected routes
  server-side.
- **Security middleware:** Helmet sets HTTP security headers; a double-submit
  cookie protects against CSRF; login endpoints are rate-limited with a
  brute-force lockout.

---

## 8. Testing

The project includes a comprehensive automated test suite under `tests/`,
covering:
- Authentication and authorization (role-based access control).
- CSRF protection.
- Rate limiting and brute-force lockout.
- Password reset flow.
- Asset and maintenance workflows.
- Audit logging and secret-scanning.
- Client-side output encoding (XSS).

The suite can be run with a single command, `npm test`, which starts a staging
server, runs the tests, and shuts down automatically. **All 66 tests pass.**

In addition to automated tests, manual acceptance testing was performed against
a live MySQL 8.0 instance, walking through each role's screens and workflows.

---

## 9. Deployment and Installation

### 9.1 Requirements
- Windows PC with internet access for initial setup.
- A running MySQL server (5.7 or 8.0).

### 9.2 Installation (Source)
1. Copy the project folder to the computer.
2. `copy .env.example .env` and set the database credentials and `SESSION_SECRET`.
3. `npm install`
4. `node database/init.js --seed`
5. `node server/app.js` (or run `start.bat`)

### 9.3 Portable Package
A standalone, pre-compiled package is provided in `release/`. It bundles a
portable Node.js runtime, so **Node.js does not need to be installed** on the
demonstration computer. Run `install.bat` once, then `IAMTS.bat` to start.

### 9.4 Default Administrator
On first run the setup script creates the initial Admin account using the
details provided in the environment file. **Only this Administrator** can then
create user accounts for Technicians and Staff (each created with a default
password that the user can change). This ensures accountability and security.

---

## 10. Key Features and Functionality

### 10.1 Role-Based Login
Different users see different menus and capabilities based on their role.

### 10.2 Asset Management (Admin)
Register assets with a unique asset tag, category, brand, model, serial
number, condition, and location. Assets can be assigned to and returned from
staff, and retired when no longer in use.

### 10.3 Maintenance Workflow
- **Staff** submits a maintenance request describing the problem and priority.
- **Admin / Technician** reviews and assigns the job.
- **Technician** updates the job to "In Progress" and eventually "Completed".
- The related asset's status is synchronized automatically.

### 10.4 Reporting and Export
The Reports page shows summary cards, a maintenance-status donut chart,
priority and technician-workload bar charts, and detailed tables. Reports can
be filtered by date range (today, week, month, or custom) and exported to
**CSV, Excel, or PDF/print**.

### 10.5 Notifications and Settings
Users receive notifications for events and can configure their notification
preferences in Settings.

---

## 11. Security

IAMTS implements the following security controls:

| Control | Implementation |
|---------|----------------|
| Password hashing | bcrypt, 10 rounds |
| Role-based access control | server-side role middleware |
| CSRF protection | double-submit cookie |
| XSS protection | HTML-entity output encoding |
| SQL injection prevention | parameterized queries |
| Brute-force protection | login rate limiting + 5-failure lockout |
| Session fixation prevention | session rotation on login |
| HTTP security headers | Helmet |
| Reset-token security | hashed, single-use, time-limited tokens |
| Audit logging | append-only audit trail |

The system also carefully avoids logging secrets (passwords, tokens, session
IDs) anywhere.

---

## 12. Challenges and Solutions

1. **Challenge:** Securing a multi-user web application against common attacks.
   **Solution:** Implemented bcrypt, CSRF protection, parameterized queries,
   Helmet headers, and rate limiting.
2. **Challenge:** Managing a native dependency (bcrypt) in a portable package.
   **Solution:** Used a portable Node.js runtime package rather than compiling
   to a single executable, ensuring reliable operation on any Windows PC.
3. **Challenge:** Making reporting useful and exportable.
   **Solution:** Built date-filterable reports with charts and CSV/Excel/PDF
   export.
4. **Challenge:** Ensuring the database is easy to set up on a new machine.
   **Solution:** Provided an idempotent initialization script and a one-click
   installer.

---

## 13. Conclusion and Recommendations

IAMTS successfully demonstrates the practical application of software
development in an industrial context. It addresses a real problem observed
during SIWES, follows a proper SDLC, and delivers a functional, secure, and
user-friendly web application.

**Recommendations for future improvement:**
- Barcode or QR-code scanning for asset lifecycle management.
- A persistent production-grade session store.
- Full facility-management and warranty-tracking modules.
- Enhanced graphical dashboards and more export formats.
- Mobile-responsive optimizations for staff on the move.

---

## 14. References
- Express.js documentation: https://expressjs.com/
- Node.js documentation: https://nodejs.org/
- MySQL documentation: https://dev.mysql.com/doc/
- bcrypt documentation: https://www.npmjs.com/package/bcrypt
- Helmet middleware: https://helmetjs.github.io/
- Project's own documentation: `docs/ERD.md`, `docs/SDLC.md`, `docs/ARCHITECTURE.md`
