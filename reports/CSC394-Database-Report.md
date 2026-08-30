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

## 1. Introduction

This report is about the database design and implementation of the ICT Assets
Maintenance & Tracking System (IAMTS). The database captures the everyday
record keeping of ICT assets at the Lagos State Ministry of Innovation, Science
and Technology, Alausa-Secretariat, Ikeja, Lagos. Before this project, all the
records were kept on paper registers and in spreadsheets, which made the data
hard to search and almost impossible to report on.

The main idea was to move this record keeping into a relational database
management system (RDBMS). In doing this I had to define the tables, enforce the
relationships between them, write queries, and support the reports and forms of
the application. The database was built using MySQL 8.0.

---

## 2. Objectives

1. To model the ICT asset lifecycle in a normalized relational database.
2. To track staff members, assets, and asset assignments.
3. To manage the maintenance request workflow.
4. To enforce data integrity using primary keys, foreign keys, and constraints.
5. To store notifications, password resets, and an audit trail.
6. To support fast and reliable reporting through indexed and aggregated queries.

---

## 3. DBMS Choice and Justification

I chose MySQL for a number of reasons:

- It is a widely used, open-source relational database.
- It supports primary and foreign key constraints, transactions, and ENUM data
  types.
- It performs well with indexing and is easy to install on Windows.
- It is one of the approved database platforms for this course (MySQL,
  PostgreSQL, Microsoft SQL, MS-Access, or Oracle).
- It connects cleanly to the Node.js application through the `mysql2` driver,
  which lets me use parameterized (prepared) queries.

---

## 4. Database Design Process

I followed these steps when designing the database:

1. **Requirement gathering** from the manual process that I observed during my
   attachment.
2. **Conceptual design** — identifying the entities (users, assets,
   maintenance, assignments) and how they relate to one another.
3. **Logical design** — producing a relational schema and removing any
   redundancy through normalization.
4. **Physical design** — writing the SQL `CREATE TABLE` statements and defining
   the data types, keys, and indexes.
5. **Implementation** — creating the database with an initialization script.
6. **Testing** — checking the data with queries and linking it to the
   application.

---

## 5. Entity Relationship Diagram (ERD)

The diagram below shows the entities and their relationships. A rendered version
is available in the project documentation (`docs/ERD.md`).

```
USERS 1 ──── * ASSET_ASSIGNMENTS * ──── 1 ASSETS * ──── 1 ASSET_CATEGORIES
 USERS 1 ──── * MAINTENANCE * ──── 1 ASSETS
 USERS 1 ──── * NOTIFICATIONS
 USERS 1 ──── 1 USER_PREFERENCES
 USERS 1 ──── * PASSWORD_RESETS
 USERS 1 ──── * AUDIT_LOG
```

The relationships are:

- One category has many assets, and each asset belongs to one category.
- One asset can be assigned to staff and returned many times, so the history is
  preserved.
- One asset can have many maintenance requests.
- A user can report a maintenance issue (as the reporter) or be assigned to fix
  it (as the technician).
- A user has exactly one notification-preference row, which is a one-to-one
  relationship.

---

## 6. Tables and Relationships

### 6.1 `users`
This table stores all the system accounts and their role. The role can be
Admin, Technician, or Staff.

| Column         | Type      | Notes                  |
|----------------|-----------|------------------------|
| id             | INT (PK)  | Auto increment         |
| full_name      | VARCHAR   |                        |
| email          | VARCHAR   | UNIQUE                 |
| phone_number   | VARCHAR   |                        |
| password       | VARCHAR   | bcrypt hash            |
| role           | ENUM      | Admin/Technician/Staff |
| department     | VARCHAR   |                        |
| status         | ENUM      | Active/Inactive        |
| created_at     | TIMESTAMP |                        |

### 6.2 `asset_categories`
This table groups assets into categories such as Laptop, Printer, Desktop, or
Server.

| Column        | Type      | Notes          |
|---------------|-----------|----------------|
| id            | INT (PK)  | Auto increment |
| category_name | VARCHAR   | UNIQUE         |
| status        | ENUM      | Active/Inactive|

### 6.3 `assets`
This is the main table with the details of every ICT asset.

| Column         | Type     | Notes                                 |
|----------------|----------|---------------------------------------|
| id             | INT (PK) | Auto increment                        |
| asset_tag      | VARCHAR  | UNIQUE                                |
| barcode        | VARCHAR  | UNIQUE                                |
| asset_name     | VARCHAR  |                                       |
| category_id    | INT (FK) | refers to asset_categories.id         |
| brand / model  | VARCHAR  |                                       |
| serial_number  | VARCHAR  | UNIQUE                                |
| purchase_date  | DATE     |                                       |
| asset_condition| ENUM     | Excellent/Good/Fair/Poor              |
| location       | VARCHAR  |                                       |
| status         | ENUM     | In Stock/Assigned/Under Maintenance/Retired/Out of Service |
| created_at     | TIMESTAMP|                                       |

### 6.4 `asset_assignments`
This records when an asset is issued to a staff member and when it is returned.

| Column            | Type      | Notes                   |
|-------------------|-----------|-------------------------|
| id                | INT (PK)  | Auto increment          |
| asset_id          | INT (FK)  | refers to assets.id     |
| staff_id          | INT (FK)  | refers to users.id      |
| assigned_by       | INT (FK)  | the Admin who assigned  |
| assigned_date     | DATETIME  |                         |
| returned_by       | INT (FK)  | who received it back    |
| returned_date     | DATETIME  |                         |
| assignment_status | ENUM      | Assigned/Returned       |

### 6.5 `maintenance`
This table manages the maintenance request workflow.

| Column               | Type      | Notes                                          |
|----------------------|-----------|------------------------------------------------|
| id                   | INT (PK)  | Auto increment                                 |
| asset_id             | INT (FK)  | refers to assets.id                            |
| reported_by          | INT (FK)  | refers to users.id                             |
| assigned_to          | INT (FK)  | the Technician                                 |
| problem_title        | VARCHAR   |                                                |
| problem_description  | TEXT      |                                                |
| priority             | ENUM      | Low/Medium/High                                |
| maintenance_status   | ENUM      | Pending/In Progress/Completed/Cancelled/Rejected/Out of Service |
| remarks              | TEXT      |                                                |
| date_reported        | TIMESTAMP |                                                |
| date_completed       | DATETIME  |                                                |
| date_cancelled       | DATETIME  |                                                |

### 6.6 Supporting tables

- `notifications` — per-user messages with a user_id foreign key, message text,
  and an is_read flag.
- `user_preferences` — opt-in flags for each notification category, in a 1:1
  relationship with users.
- `password_resets` — one-time, time-limited reset tokens that are stored as
  SHA-256 hashes.
- `audit_log` — an append-only record of important system and security events.

---

## 7. Data Integrity and Constraints

- **Primary keys** are used to uniquely identify each row.
- **Foreign keys** enforce referential integrity. For example, a maintenance
  request cannot point to an asset that does not exist.
- **ENUM types** restrict the values to valid domains, so invalid data cannot
  get into the system.
- **UNIQUE constraints** on the asset tag, barcode, serial number, and email
  stop duplicates from being saved.
- **ON DELETE CASCADE** is used on child tables where an orphan row would make
  no sense, such as `user_preferences` and `password_resets`.
- **ON DELETE SET NULL** is used on the audit actor so that the audit trail is
  kept even if a user is removed.
- **Indexes** are placed on the foreign keys and on the columns that are often
  used for filtering, so the queries stay fast.

---

## 8. Security of the Database

1. **Parameterized queries** — the application uses prepared statements, so
   user input can never change the SQL. This prevents SQL injection.
2. **Password hashing** — passwords are stored as bcrypt hashes and never as
   plain text.
3. **Reset-token hashing** — only the SHA-256 hash of a reset token is stored,
   not the raw token itself.
4. **Audit logging** — sensitive events are recorded, and the audit detail is a
   keep-list JSON value that does not contain secrets.
5. **No secret logging** — the application and the tests are written so that
   passwords, tokens, session IDs, and CSRF tokens are never printed.

---

## 9. Forms, Queries and Reports

- **Forms:** the web application provides data-entry forms for adding and
  editing assets, registering users, and submitting maintenance requests. All
  the data collected is validated before it is written to the database.
- **Queries:** the application runs queries to list assets, filter maintenance
  requests, pull user-specific data, and calculate statistics.
- **Reports:** the Reports page uses SQL `SUM` and `CASE` statements over a
  chosen date range, and displays the results as charts and tables that can be
  exported to CSV, Excel, or PDF.

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

The database is normalized to Third Normal Form (3NF):

- **1NF:** all tables have atomic values and there are no repeating groups.
- **2NF:** there are no partial dependencies. The non-key columns depend on the
  whole primary key.
- **3NF:** there are no transitive dependencies. For example, asset details live
  only in the `assets` table and are referenced by foreign key everywhere else,
  so nothing is duplicated.

---

## 12. Challenges and Solutions

1. **Challenge:** Modeling the asset assignment history correctly.
   **Solution:** I used a separate `asset_assignments` table so that the full
   issue and return history is preserved instead of overwriting a single value.
2. **Challenge:** Keeping the asset status in sync with the maintenance status.
   **Solution:** A migration extended the `assets.status` and
   `maintenance.maintenance_status` enums, and the application updates the
   asset status when a job becomes in progress or is completed.
3. **Challenge:** Storing password reset tokens safely.
   **Solution:** The reset tokens are stored as SHA-256 hashes with an expiry
   and a single-use flag.
4. **Challenge:** Avoiding duplication and anomalies.
   **Solution:** I normalized the database fully to 3NF and added foreign-key
   constraints.

---

## 13. Conclusion and Recommendations

The IAMTS database successfully automates the record keeping of ICT assets,
staff assignments, and maintenance. It is normalized, it enforces referential
integrity, it handles data securely, and it powers the reporting and forms of
the application.

For future work, I would recommend:

- Using database users with least privilege instead of connecting as root.
- Adding scheduled automated backups.
- Creating summary tables or partitioning if the data grows very large.
- Adding views to make common reporting queries simpler.

---

## 14. References

- MySQL 8.0 Reference Manual: https://dev.mysql.com/doc/
- Database normalization explanation: https://www.geeksforgeeks.org/normal-forms-in-dbms/
- `mysql2` Node.js driver: https://www.npmjs.com/package/mysql2
- Project ERD documentation: `docs/ERD.md`
