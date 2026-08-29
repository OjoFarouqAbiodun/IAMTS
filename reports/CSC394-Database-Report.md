# DATABASE REPORT — CSC 394
## Practical Application of Database Management in Industries

**Student:** Ojo Farouq Abiodun
**Matriculation Number:** 22110591344
**Department:** Computer Science
**Institution:** Lagos State University, Ojo
**SIWES Organization:** Lagos State Ministry of Innovation, Science and Technology, Alausa-Secretariat, Ikeja, Lagos
**Industrial Supervisor:** Mr. Tola Ajagbe
**Project Database:** ICT Assets Maintenance & Tracking System (IAMTS) — MySQL

---

## Table of Contents
1. Introduction
2. Objectives
3. DBMS Choice and Justification
4. Database Design Process
5. Entity Relationship Diagram (ERD)
6. Tables and Relationships
7. Data Integrity and Constraints
8. Security of the Database
9. Forms, Queries and Reports
10. Sample SQL Queries
11. Normalization
12. Challenges and Solutions
13. Conclusion and Recommendations
14. References

---

## 1. Introduction

This report describes the **database design and implementation** of the ICT
Assets Maintenance & Tracking System (IAMTS). The database captures the
day-to-day record-keeping of ICT assets at the Lagos State Ministry of
Innovation, Science and Technology, Alausa-Secretariat, Ikeja, Lagos, which was
previously handled using paper registers and spreadsheets.

The goal was to **automate record-keeping** using a relational database
management system (RDBMS), demonstrating the ability to define tables, enforce
relationships, issue queries, and produce reports and forms. The database was
implemented using **MySQL 8.0**.

---

## 2. Objectives

1. Model the ICT asset lifecycle in a normalized relational database.
2. Track staff members, assets, and asset assignments.
3. Manage the maintenance request workflow.
4. Enforce data integrity using primary and foreign keys and constraints.
5. Store notifications, password resets, and an audit trail.
6. Support fast, reliable reporting through indexed and aggregated queries.

---

## 3. DBMS Choice and Justification

MySQL was chosen because:
- It is a widely used, open-source relational database.
- It supports primary/foreign key constraints, transactions, and `ENUM` types.
- It provides good performance with indexing and is easy to install on Windows.
- It is one of the approved DBMS platforms for this course (MySQL/PostgreSQL/
  Microsoft SQL/MS-Access/Oracle).
- It integrates cleanly with the Node.js application through the `mysql2`
  driver using parameterized (prepared) queries.

---

## 4. Database Design Process

The design followed these steps:
1. **Requirement gathering** from the observed manual process.
2. **Conceptual design** — identifying entities (users, assets, maintenance,
   assignments) and their relationships.
3. **Logical design** — producing a relational schema, eliminating
   redundancies through normalization.
4. **Physical design** — writing SQL `CREATE TABLE` statements, defining data
   types, keys, and indexes.
5. **Implementation** — creating the database with an initialization script.
6. **Testing** — verifying data with queries and integrating with the application.

---

## 5. Entity Relationship Diagram (ERD)

The diagram below shows the entities and their relationships. A rendered
version is available in the project documentation (`docs/ERD.md`).

```
USERS 1 ──── * ASSET_ASSIGNMENTS * ──── 1 ASSETS * ──── 1 ASSET_CATEGORIES
 USERS 1 ──── * MAINTENANCE * ──── 1 ASSETS
 USERS 1 ──── * NOTIFICATIONS
 USERS 1 ──── 1 USER_PREFERENCES
 USERS 1 ──── * PASSWORD_RESETS
 USERS 1 ──── * AUDIT_LOG
```

**Cardinalities:**
- One category has many assets; each asset belongs to one category.
- One asset can be assigned and returned many times (history is preserved).
- One asset can have many maintenance requests.
- A user can request maintenance (reporter) or be assigned to it (technician).
- A user has exactly one notification-preference row (1:1).

---

## 6. Tables and Relationships

### 6.1 `users`
Stores all system accounts and their role (`Admin`, `Technician`, `Staff`).

| Column | Type | Notes |
|--------|------|-------|
| id | INT (PK) | Auto increment |
| full_name | VARCHAR | |
| email | VARCHAR | UNIQUE |
| phone_number | VARCHAR | |
| password | VARCHAR | bcrypt hash |
| role | ENUM | Admin / Technician / Staff |
| department | VARCHAR | |
| status | ENUM | Active / Inactive |
| created_at | TIMESTAMP | |

### 6.2 `asset_categories`
Classification of assets (e.g., Laptop, Printer, Desktop, Server).

| Column | Type | Notes |
|--------|------|-------|
| id | INT (PK) | Auto increment |
| category_name | VARCHAR | UNIQUE |
| status | ENUM | Active / Inactive |

### 6.3 `assets`
Details of each ICT asset.

| Column | Type | Notes |
|--------|------|-------|
| id | INT (PK) | Auto increment |
| asset_tag | VARCHAR | UNIQUE |
| barcode | VARCHAR | UNIQUE |
| asset_name | VARCHAR | |
| category_id | INT (FK) | → asset_categories.id |
| brand / model | VARCHAR | |
| serial_number | VARCHAR | UNIQUE |
| purchase_date | DATE | |
| asset_condition | ENUM | Excellent / Good / Fair / Poor |
| location | VARCHAR | |
| status | ENUM | In Stock / Assigned / Under Maintenance / Retired / Out of Service |
| created_at | TIMESTAMP | |

### 6.4 `asset_assignments`
Records when an asset is issued to staff and returned.

| Column | Type | Notes |
|--------|------|-------|
| id | INT (PK) | Auto increment |
| asset_id | INT (FK) | → assets.id |
| staff_id | INT (FK) | → users.id |
| assigned_by | INT (FK) | → users.id (Admin) |
| assigned_date | DATETIME | |
| returned_by | INT (FK) | → users.id |
| returned_date | DATETIME | |
| assignment_status | ENUM | Assigned / Returned |

### 6.5 `maintenance`
The maintenance request workflow.

| Column | Type | Notes |
|--------|------|-------|
| id | INT (PK) | Auto increment |
| asset_id | INT (FK) | → assets.id |
| reported_by | INT (FK) | → users.id |
| assigned_to | INT (FK) | → users.id (Technician) |
| problem_title | VARCHAR | |
| problem_description | TEXT | |
| priority | ENUM | Low / Medium / High |
| maintenance_status | ENUM | Pending / In Progress / Completed / Cancelled / Rejected / Out of Service |
| remarks | TEXT | |
| date_reported | TIMESTAMP | |
| date_completed | DATETIME | |
| date_cancelled | DATETIME | |

### 6.6 Supporting tables
- `notifications` — per-user messages (user_id FK, message, is_read).
- `user_preferences` — opt-in flags for each notification category (1:1 with users).
- `password_resets` — one-time, time-limited reset tokens stored as SHA-256 hashes.
- `audit_log` — append-only record of meaningful system and security events.

---

## 7. Data Integrity and Constraints

- **Primary keys** uniquely identify each row.
- **Foreign keys** enforce referential integrity (e.g., a maintenance request
  cannot reference a non-existent asset).
- **`ENUM` types** restrict values to valid domains, preventing invalid data.
- **`UNIQUE` constraints** on asset tag, barcode, serial number, and email
  prevent duplicates.
- **`ON DELETE CASCADE`** on child tables where orphans are meaningless
  (`user_preferences`, `password_resets`).
- **`ON DELETE SET NULL`** on the audit actor so the audit trail is retained.
- **Indexes** on foreign keys and frequently filtered columns speed up queries.

---

## 8. Security of the Database

1. **Parameterized queries** — the application uses prepared statements, so
   user input can never alter SQL (prevents SQL injection).
2. **Password hashing** — passwords are stored as bcrypt hashes, never plaintext.
3. **Reset-token hashing** — only the SHA-256 hash of a reset token is stored,
   never the raw token.
4. **Audit logging** — sensitive events are recorded; the audit detail is an
   allowlisted JSON value set that contains no secrets.
5. **Not logging secrets** — the application and tests are designed never to
   print passwords, tokens, session IDs, or CSRF tokens.

---

## 9. Forms, Queries and Reports

- **Forms:** the web application provides data-entry forms for adding/editing
  assets, registering users, and submitting maintenance requests. These forms
  collect data that is validated before being written to the database.
- **Queries:** the application issues queries to list assets, filter maintenance
  requests, retrieve user-specific data, and aggregate statistics.
- **Reports:** the Reports page aggregates data using SQL `SUM`/`CASE`
  statements over selectable date ranges and displays them as charts and tables
  that can be exported to CSV, Excel, or PDF.

---

## 10. Sample SQL Queries

**1. Total assets grouped by status**
```sql
SELECT status, COUNT(*) AS total
FROM assets
GROUP BY status
ORDER BY total DESC;
```

**2. Open maintenance requests (pending or in progress)**
```sql
SELECT a.asset_name, m.problem_title, m.priority, m.maintenance_status
FROM maintenance m
JOIN assets a ON a.id = m.asset_id
WHERE m.maintenance_status IN ('Pending', 'In Progress')
ORDER BY m.date_reported;
```

**3. Technician workload**
```sql
SELECT u.full_name AS technician,
       COUNT(m.id) AS jobs_assigned,
       SUM(CASE WHEN m.maintenance_status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN m.maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completed
FROM maintenance m
JOIN users u ON u.id = m.assigned_to
GROUP BY u.id
ORDER BY jobs_assigned DESC;
```

**4. Assets currently assigned to a specific staff member**
```sql
SELECT a.asset_name, a.asset_tag, aa.assigned_date
FROM asset_assignments aa
JOIN assets a ON a.id = aa.asset_id
JOIN users u ON u.id = aa.staff_id
WHERE u.email = 'aogunleye@iamts.com'
  AND aa.assignment_status = 'Assigned';
```

**5. Maintenance summary over a date range (used by the reports page)**
```sql
SELECT
  SUM(CASE WHEN maintenance_status = 'Pending' THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN maintenance_status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
  SUM(CASE WHEN maintenance_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
  SUM(CASE WHEN maintenance_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM maintenance
WHERE date_reported >= '2026-01-01 00:00:00'
  AND date_reported <  '2026-02-01 00:00:00';
```

---

## 11. Normalization

The database is normalized to **Third Normal Form (3NF)**:
- **1NF:** all tables have atomic values and no repeating groups.
- **2NF:** no partial dependencies — non-key columns depend on the whole
  primary key.
- **3NF:** no transitive dependencies — e.g., asset details live only in
  `assets` and are referenced by foreign key everywhere else, avoiding
  duplication.

---

## 12. Challenges and Solutions

1. **Challenge:** Modeling the asset assignment history correctly.
   **Solution:** A separate `asset_assignments` table preserves a full issue/
   return history instead of overwriting a single value.
2. **Challenge:** Keeping the maintenance asset status in sync.
   **Solution:** A migration extended the `assets.status` and
   `maintenance.maintenance_status` enums, and the application updates the asset
   status when a job becomes in progress or completes.
3. **Challenge:** Safe password reset storage.
   **Solution:** Reset tokens are stored as SHA-256 hashes with an expiry and a
   single-use flag.
4. **Challenge:** Avoiding duplication and anomalies.
   **Solution:** Full normalization to 3NF plus foreign-key constraints.

---

## 13. Conclusion and Recommendations

The IAMTS database successfully automates the record-keeping of ICT assets,
staff assignments, and maintenance. It is normalized, enforces referential
integrity, supports secure data handling, and powers the application's reports
and forms.

**Recommendations:**
- Introduce database users with least-privilege (a dedicated app user rather
  than root).
- Add scheduled automated backups.
- Consider partitioning/summary tables if data grows very large.
- Add views to simplify common reporting queries.

---

## 14. References
- MySQL 8.0 Reference Manual: https://dev.mysql.com/doc/
- Database normalization: https://www.geeksforgeeks.org/normal-forms-in-dbms/
- `mysql2` Node.js driver: https://www.npmjs.com/package/mysql2
- Project's own ERD documentation: `docs/ERD.md`
