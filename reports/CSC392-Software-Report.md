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

## 1. Introduction

I did my Industrial Training at the ICT department of the Lagos State Ministry
of Innovation, Science and Technology, Alausa-Secretariat, Ikeja, Lagos. While I
was there, I noticed how ICT assets like computers, printers, and servers were
being taken care of. The truth is that most of the record keeping was done by
hand, using paper registers and Excel files. This made it very difficult for
anyone to say exactly who was in possession of an asset at a given time, when
an item went in for repairs, or who was responsible for fixing it.

So I decided to develop the ICT Assets Maintenance & Tracking System (IAMTS).
It is a web application that automates this kind of record keeping and shows
the practical use of software development in a real work environment. The
system provides different access levels for administrators, maintenance
technicians, and general staff. It handles asset registration, assigning assets
to staff members, and the whole maintenance request process.

This report covers IAMTS as my CSC 392 deliverable and follows the System
Development Life Cycle (SDLC) from the analysis stage through design,
implementation, and testing.

---

## 2. Problem Statement

From what I observed, the ICT department was managing its assets manually, and
this came with a lot of problems:

- Asset records were scattered about in paper registers and spreadsheet files.
- There was no reliable way to know which staff member had which asset.
- Maintenance requests were handled verbally or informally, so there was no
  proper record or audit trail.
- It was not clear when equipment went into maintenance or when it came out.
- Preparing reports was slow because someone had to sit down and collate the
  data by hand.

All of these made it hard to locate assets quickly, to hold anyone accountable,
and to keep the maintenance process transparent. IAMTS was built to address
these problems directly.

---

## 3. Objectives

The main objectives of this project are:

1. To build a working web application that manages ICT asset records.
2. To automate the maintenance request and tracking workflow.
3. To provide role-based access for Admin, Technician, and Staff users.
4. To generate useful reports for the ICT team.
5. To follow the System Development Life Cycle properly.
6. To make the system secure through authentication, authorization, and audit
   logging.

---

## 4. System Analysis

### 4.1 Users and Roles

- **Admin** — has full control over the system. The Admin can manage users,
  assets, requests, reports, settings, and the audit logs.
- **Technician** — handles the maintenance jobs that are assigned to them,
  updates the progress of each job, and marks jobs as completed.
- **Staff** — requests maintenance for assets and can follow the status of
  their own requests.

### 4.2 Functional Requirements

- Login, logout, change password, and password reset.
- Register, update, assign, and retire ICT assets.
- Submit maintenance requests.
- Track the maintenance status which moves through Pending, In Progress,
  Completed, or Cancelled.
- View dashboards and reports with date filtering and export options.
- Receive and manage notifications.

### 4.3 Non-Functional Requirements

- **Security:** password hashing, role-based access control, CSRF protection,
  XSS protection, rate limiting, and brute-force lockout.
- **Auditability:** an audit log records meaningful events in the system.
- **Usability:** each role sees an interface that matches what they actually do.
- **Performance:** the database queries are indexed and the reports are
  aggregated to keep things fast.
- **Portability:** the system runs on a standard Windows PC with Node.js and
  MySQL.

---

## 5. System Design

### 5.1 Architecture

IAMTS uses a three-tier architecture:

- **Presentation layer:** HTML, CSS, and JavaScript pages that are served to
  the browser.
- **Application layer:** an Express (Node.js) server that exposes RESTful APIs.
- **Data layer:** a MySQL relational database that is accessed using
  parameterized queries.

### 5.2 Database Design

The database is normalized to Third Normal Form (3NF) and is made up of these
tables: `users`, `asset_categories`, `assets`, `asset_assignments`,
`maintenance`, `notifications`, `user_preferences`, `password_resets`, and
`audit_log`. A full entity relationship diagram is provided in the separate
Database Report (CSC 394).

### 5.3 User Interface Design

I designed the interface around what each role actually needs. The Admin sees
the management screens such as assets, users, pending requests, and reports.
The Technician sees a dashboard of the jobs assigned to them. The Staff sees an
interface for submitting and tracking requests. I used a consistent sidebar
layout, status badges, and toast notifications so that the system is easy to
navigate and does not confuse the user.

---

## 6. System Development Life Cycle (SDLC)

I used the Waterfall SDLC model for this project, with an iterative testing
phase at the end. The table below shows the phases and what each one produced.

| Phase       | Activities                                                    | Deliverable                  |
|-------------|---------------------------------------------------------------|------------------------------|
| 1. Planning | Feasibility study, defining scope, gathering requirements     | Scope and requirement list   |
| 2. Analysis | Functional and non-functional requirements, defining roles    | Requirements specification   |
| 3. Design    | ERD, normalized schema, interface design, security design     | Database schema, UI design   |
| 4. Implementation | Back-end APIs, front-end pages, database initialization  | Working application          |
| 5. Testing   | Security regression suite, integration tests, acceptance tests| Verified build               |
| 6. Deployment| Setup and start scripts, environment configuration            | Installable package          |
| 7. Maintenance | Versioned migrations, documented gaps, backup automation    | Maintained system            |

The full SDLC write-up can be found in the project documentation
(`docs/SDLC.md`).

---

## 7. Implementation (Technology Stack)

| Layer        | Technology                                    |
|--------------|-----------------------------------------------|
| Front-end    | HTML5, CSS3, vanilla JavaScript, Font Awesome |
| Back-end     | Node.js, Express 5                            |
| Database     | MySQL (using the `mysql2` driver)             |
| Sessions     | `express-session`                             |
| Security     | Helmet, bcrypt, CSRF double-submit cookie, rate limiting |
| Testing      | Node built-in test runner                     |
| Version control | Git                                       |

### 7.1 Key Implementation Details

- **RESTful API:** the routes are organized under `server/routes/` and the
  handlers are in `server/controllers/`.
- **Data access:** the models in `server/models/` use parameterized SQL queries
  so that SQL injection is prevented.
- **Authentication:** passwords are hashed with bcrypt (10 rounds) and the
  session is rotated when a user logs in to stop session fixation.
- **Authorization:** a role-check middleware restricts protected routes on the
  server side.
- **Security middleware:** Helmet sets the HTTP security headers, a
  double-submit cookie protects against CSRF, and the login endpoints are
  rate-limited with a brute-force lockout.

---

## 8. Testing

The project has a comprehensive automated test suite under `tests/`. It covers:

- Authentication and authorization (role-based access control).
- CSRF protection.
- Rate limiting and brute-force lockout.
- The password reset flow.
- The asset and maintenance workflows.
- Audit logging and a secret-scanning check.
- Client-side output encoding (XSS).

The whole suite can be run with one command, `npm test`, which starts a staging
server, runs the tests, and shuts itself down. All 66 tests pass.

Apart from the automated tests, I also did manual acceptance testing against a
live MySQL 8.0 instance, going through each role's screens and workflows by
hand.

---

## 9. Deployment and Installation

### 9.1 Requirements

- A Windows PC with internet access for the initial setup.
- A running MySQL server (5.7 or 8.0).

### 9.2 Installation from Source

1. Copy the project folder onto the computer.
2. Run `copy .env.example .env` and set the database credentials and the
   `SESSION_SECRET`.
3. Run `npm install`.
4. Run `node database/init.js --seed`.
5. Run `node server/app.js` (or just run `start.bat`).

### 9.3 Portable Package

I also prepared a standalone package in `release/`. It comes with its own
portable Node.js runtime, so Node.js does not need to be installed on the
demonstration computer. You run `install.bat` once and then `IAMTS.bat` to
start the system.

### 9.4 Default Administrator

On the first run, the setup script creates the initial Admin account using the
details in the environment file. Only this Administrator can then create user
accounts for Technicians and Staff. Each new user is created with a default
password that they can change. This helps with accountability and security.

---

## 10. Key Features and Functionality

### 10.1 Role-Based Login

Different users see different menus and features depending on their role. This
keeps things simple and safe.

### 10.2 Asset Management (Admin)

The Admin can register an asset with a unique asset tag, category, brand,
model, serial number, condition, and location. Assets can be assigned to staff
and returned, and retired when they are no longer in use.

### 10.3 Maintenance Workflow

- A Staff member submits a maintenance request and describes the problem and
  its priority.
- The Admin or a Technician reviews the request and assigns a job.
- The Technician updates the job to In Progress and later to Completed.
- The status of the related asset is updated automatically.

### 10.4 Reporting and Export

The Reports page shows summary cards, a donut chart of maintenance status, bar
charts for priority and technician workload, and detailed tables. The reports
can be filtered by date range (today, week, month, or a custom range) and
exported to CSV, Excel, or PDF/print.

### 10.5 Notifications and Settings

Users receive notifications for different events and can set their own
notification preferences in the Settings page.

---

## 11. Security

IAMTS implements the following security controls:

| Control                      | Implementation                        |
|------------------------------|---------------------------------------|
| Password hashing             | bcrypt, 10 rounds                     |
| Role-based access control    | server-side role middleware           |
| CSRF protection              | double-submit cookie                  |
| XSS protection               | HTML-entity output encoding           |
| SQL injection prevention     | parameterized queries                 |
| Brute-force protection       | login rate limiting + 5-failure lockout |
| Session fixation prevention  | session rotation on login             |
| HTTP security headers        | Helmet                                |
| Reset-token security         | hashed, single-use, time-limited tokens |
| Audit logging                | append-only audit trail               |

The system is also careful not to log secrets such as passwords, tokens, or
session IDs anywhere.

---

## 12. Challenges and Solutions

1. **Challenge:** Securing a multi-user web application against common attacks.
   **Solution:** I implemented bcrypt, CSRF protection, parameterized queries,
   Helmet headers, and rate limiting.
2. **Challenge:** Managing a native dependency (bcrypt) inside a portable
   package. **Solution:** I used a portable Node.js runtime package instead of
   compiling everything into a single executable, so that it works reliably on
   any Windows PC.
3. **Challenge:** Making the reporting actually useful and exportable.
   **Solution:** I built date-filterable reports with charts and CSV/Excel/PDF
   export options.
4. **Challenge:** Setting the database up easily on a new machine.
   **Solution:** I wrote an idempotent initialization script and a one-click
   installer.

---

## 13. Conclusion and Recommendations

IAMTS shows how software development can be applied in a real industrial
setting. It solves a genuine problem I saw during my SIWES attachment, follows a
proper SDLC, and delivers a functional, secure, and easy-to-use web application.

For future improvement, I would suggest:

- Barcode or QR-code scanning for asset lifecycle management.
- A persistent session store that is ready for production.
- Full facility management and warranty tracking modules.
- Better graphical dashboards and more export formats.
- Mobile-friendly improvements for staff who are moving around.

---

## 14. References

- Express.js documentation: https://expressjs.com/
- Node.js documentation: https://nodejs.org/
- MySQL documentation: https://dev.mysql.com/doc/
- bcrypt documentation: https://www.npmjs.com/package/bcrypt
- Helmet middleware: https://helmetjs.github.io/
- Project documentation: `docs/ERD.md`, `docs/SDLC.md`, `docs/ARCHITECTURE.md`
