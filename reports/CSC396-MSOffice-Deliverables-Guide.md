# CSC 396 — MS Office Deliverables Build Guide

Use this guide to build the actual MS Office files that prove the work
claimed in your CSC 396 Microsoft Report. Everything below is ready to
copy into Word, Excel, PowerPoint, and Access.

Build all of these and keep them in a folder named `CSC396-MSOffice-Deliverables\`
to hand in alongside your report.

---

## FILE 1 — Word: Curriculum Vitae (CV) — `OJO_FAROUQ_CV.docx`

You already have `OJO_FAROUQ_CV.docx` and `OJO_FAROUQ_CV.pdf` on `E:\`.
That file IS this deliverable. Make sure it is a clean, single-page CV
built with Word **styles** (Heading 1 for section titles), a table for
education, and consistent formatting. It must NOT be a plain block of text.

### Required CV structure (matching your real background)

```
OJO FAROUQ ABIODUN
ICT Intern | Lagos State Ministry of Innovation, Science & Technology
Lagos State University, Ojo — B.Sc Computer Science (400 Level)
Email: [your email] | Phone: [your phone] | Location: Lagos, Nigeria

--- PROFESSIONAL SUMMARY ---
Computer Science undergraduate with six months' hands-on experience in a
government ICT department. Skilled in hardware maintenance, Microsoft
Office, MySQL database design, and web application development (Node.js
+ Express). Built IAMTS, a full-stack asset management and maintenance
tracking system, as a SIWES project.

--- TECHNICAL SKILLS ---
- Languages: SQL, JavaScript, HTML, CSS
- Databases: MySQL (design, normalization, queries)
- Web: Node.js, Express, REST APIs
- Tools: Microsoft Office (Word, Excel, PowerPoint, Access, Outlook),
  GitHub, Windows
- Hardware: PC assembly, troubleshooting, printer maintenance

--- EXPERIENCE ---
ICT Intern — Ministry of Innovation, Science & Technology, Alausa, Lagos
  • Maintained ICT asset and maintenance records across the department
  • Assisted with PC and printer hardware repair and software setup
  • Documented processes and prepared reports in Word and Excel
  • Built IAMTS web system automating asset tracking & maintenance

--- EDUCATION ---
Lagos State University, Ojo — B.Sc Computer Science [Year - present]
  • Courses: CSC 392 Application Dev, CSC 394 Database Design,
    CSC 396 MS Office, CSC 398 SIWES

--- CERTIFICATIONS / TRAINING ---
SIWES Industrial Training (6 months) — CSC 398

--- REFERENCES ---
Available on request
```

### To "prove" Word skills, ensure each of these is visibly present:
- [ ] Used Heading styles (not just bold) for section titles
- [ ] A table for the Education section (columns: Institution | Degree | Year)
- [ ] Header with your name, footer with page number
- [ ] Clean margins and a professional font (e.g. Calibri 11)

---

## FILE 2 — Word: Mail Merge — `MailMerge-Letter.docx` + `MailMerge-Recipients.xlsx`

### Step 1 — Create the recipient list in Excel first
File: `MailMerge-Recipients.xlsx`. Column headers in row 1, one recipient per row.

| FirstName | LastName | Department  | AssetReturnDate | Email                     |
|-----------|----------|-------------|-----------------|---------------------------|
| Adaeze    | Okonkwo  | Finance     | 2026-09-15      | aokonkwo@ministry.gov.ng  |
| Chinedu   | Eze      | HR          | 2026-09-18      | ceze@ministry.gov.ng      |
| Folake    | Adeyemi  | Admin       | 2026-09-20      | fadayemi@ministry.gov.ng  |
| Ibrahim   | Sule     | ICT         | 2026-09-22      | isule@ministry.gov.ng     |
| Ngozi     | Okafor   | Accounts    | 2026-09-25      | nokafor@ministry.gov.ng   |

### Step 2 — Write the mail-merge letter in Word
File: `MailMerge-Letter.docx`.

```
[Date]

«FirstName» «LastName»
«Department» Department
Lagos State Ministry of Innovation, Science and Technology
Alausa Secretariat, Ikeja, Lagos

Dear «FirstName» «LastName»,

RE: NOTICE OF ICT ASSET RETURN

Following the routine audit of ICT equipment, we are writing to request
that you return any ICT asset assigned to you on or before
«AssetReturnDate».

Please note the following:
- Bring the asset and its charger/accessories to the ICT department.
- A staff member in ICT will issue a return confirmation.
- Assets not returned by the date above will be flagged in our records.

If you have any questions, please contact the ICT department.

Thank you for your cooperation.

Yours faithfully,

ICT Department
Lagos State Ministry of Innovation, Science and Technology
```

### Step 3 — Run the merge
In Word: **Mailings → Select Recipients → Use an Existing List** → pick
`MailMerge-Recipients.xlsx` → insert the merge fields (`FirstName`,
`LastName`, etc.) where the «...» placeholders are → **Finish & Merge →
Edit Individual Documents**. This produces personalized copies.

### Proof to keep:
- [ ] The merged output showing 5 personalized letters
- [ ] The Excel recipient-source file
- [ ] Screenshot of the Mailings ribbon with the field codes visible

---

## FILE 3 — Excel: Asset Inventory with formulas + chart — `AssetInventory.xlsx`
## FILE 3b — Excel: Macro-enabled — `AssetInventory.xlsm`

Build one workbook with two sheets. Name them `Assets` and `Summary`.

### Sheet "Assets" — raw data

| AssetID | AssetName  | Category | Brand   | Location | Status          | PurchaseCost |
|---------|------------|----------|---------|----------|-----------------|--------------|
| 1       | Dell Laptop| Laptop   | Dell    | Finance  | Assigned        | 350000       |
| 2       | HP Printer | Printer  | HP      | Admin    | In Maintenance  | 120000       |
| 3       | Dell Desktop | Desktop| Dell    | HR       | In Stock        | 280000       |
| 4       | HP Laptop  | Laptop   | HP      | Accounts | Assigned        | 340000       |
| 5       | Epson Printer | Printer| Epson | Training | In Maintenance  | 98000        |
| 6       | Lenovo Laptop | Laptop| Lenovo | ICT     | In Stock        | 310000       |
| 7       | Dell Server | Server  | Dell    | Server Room | In Stock      | 1500000      |
| 8       | Canon Printer | Printer| Canon | Finance | Out of Service | 88000        |

### Sheet "Summary" — use formulas (the formula cells auto-answer)

Put these in cells on the Summary sheet:

| Cell  | Label                     | Formula                                            | Expected |
|-------|---------------------------|----------------------------------------------------|----------|
| B1    | Total Assets              | `=COUNTA(Assets!A2:A9)`                            | 8        |
| B2    | Total Purchase Value      | `=SUM(Assets!G2:G9)`                               | add-up   |
| B3    | Laptops                   | `=COUNTIF(Assets!C2:C9,"Laptop")`                  | 3        |
| B4    | Printers                  | `=COUNTIF(Assets!C2:C9,"Printer")`                 | 3        |
| B5    | In Stock                  | `=COUNTIF(Assets!F2:F9,"In Stock")`                | 3        |
| B6    | Under Maintenance         | `=COUNTIF(Assets!F2:F9,"In Maintenance")`          | 2        |
| B7    | Assigned                  | `=COUNTIF(Assets!F2:F9,"Assigned")`                | 2        |
| B8    | Expensive? (>=500000)     | `=IF(SUM(Assets!G2:G9)>=500000,"High","Low")`      | High     |

### A chart
Select `Category` column A:A + value counts, and insert a **Pie Chart**
showing the distribution of assets by category (Laptop / Printer /
Desktop / Server).

### The macro (in the .xlsm version)
Record a macro that:
1. Selects the data range on the Assets sheet.
2. Applies **bold headers**.
3. Applies a **background fill** to the header row.
4. **Auto-fits** all columns.

Shortcut to record: **View → Macros → Record Macro** → do the steps →
**Stop Recording**. Name it `FormatAssetTable`. Save as `.xlsm`.

### How to show the macro in the report:
- [ ] In VBA (`Alt+F11`) → screenshot the `FormatAssetTable` sub so the
      panel can see code exists.
- [ ] Run it once live to prove it works.

---

## FILE 4 — PowerPoint: IAMTS Project Presentation — `IAMTS-Defense.pptx`

Create a defense presentation. Target ~12 slides. Use a text placeholder
like `[add screenshot of app here]` wherever you later insert screenshots.

### Slide-by-slide content

**Slide 1 — Title**
```
ICT Assets Maintenance & Tracking System (IAMTS)
A SIWES Project
Ojo Farouq Abiodun — 22110591344
CSC 392/394/396/398 — Lagos State University
```

**Slide 2 — The Problem**
```
BEFORE
• ICT assets tracked on paper registers and spreadsheets
• No single source of truth for who has what
• No record of when maintenance happened
• Slow, unaccountable, hard to report on
```

**Slide 3 — The Solution**
```
IAMTS — a web system that:
• Centralizes asset records in a MySQL database
• Automates the maintenance workflow
• Gives role-based access (Admin / Technician / Staff)
• Produces live reports you can export
```

**Slide 4 — Technology Stack**
```
• Frontend: HTML, CSS, JavaScript
• Backend: Node.js + Express
• Database: MySQL (parameterized queries)
• Security: bcrypt, Helmet, CSRF, rate-limiting
```

**Slide 5 — Database Design (CSC 394)**
```
• 9 tables, normalized to 3NF
• users, asset_categories, assets, asset_assignments,
  maintenance, notifications, user_preferences,
  password_resets, audit_log
• ERD available in docs/ERD.md
[add ERD screenshot here]
```

**Slide 6 — Sample SQL Query**
```
-- Total assets grouped by status
SELECT status, COUNT(*) AS total
FROM assets
GROUP BY status
ORDER BY total DESC;
```

**Slide 7 — Roles**
```
ADMIN     → manage everything
TECHNICIAN→ assigned maintenance jobs
STAFF     → request & track maintenance
```

**Slide 8 — Maintenance Workflow**
```
Staff submits request → Admin/Technician assigns job
→ Technician updates In Progress → Completed
[add maintenance page screenshot]
```

**Slide 9 — Reports & Export**
```
• Date-filtered reports
• Donut + bar charts
• Export to CSV / Excel / PDF
[add reports page screenshot]
```

**Slide 10 — Security Controls**
```
• bcrypt password hashing
• Role-based authorization
• CSRF double-submit cookie
• XSS output encoding
• Login rate-limiting + brute-force lockout
• Audit logging
```

**Slide 11 — Testing**
```
66 automated tests — npm test
Covers auth, CSRF, rate limiting, SQL injection, XSS, RBAC
```

**Slide 12 — Challenges / What's Next**
```
Challenges: manual records, learning security, portable packaging
Next: QR/barcode scanning, persistent sessions, email notifications
```

### Animations required (proof for CSC 396)
- [ ] Add a **fade** entrance animation to bullet points on Slides 2-3
- [ ] Add a **transition** (e.g. Push or Morph) between all slides
- [ ] Add a **motion path** or emphasis effect to the title on Slide 1
- [ ] Use consistent theme + font throughout (helps design marks)

---

## FILE 5 — Access: Demo database — `IAMTS-Demo.accdb`

A small demo that mirrors your report claims. 5 objects total.

### Table 1: `tbl_Assets`
| Field      | Type          | Notes          |
|------------|---------------|----------------|
| AssetID    | AutoNumber    | Primary Key    |
| AssetName  | Short Text    |                |
| Category   | Short Text    |                |
| Brand      | Short Text    |                |
| Status     | Short Text    |                |
| PurchaseCost | Currency   |                |

Enter 5-6 sample rows (reuse the Excel data above).

### Table 2: `tbl_Staff`
| Field   | Type       | Notes          |
|---------|------------|----------------|
| StaffID | AutoNumber | Primary Key    |
| FullName| Short Text |                |
| Department | Short Text |            |
| Email   | Short Text |                |

### Table 3: `tbl_Assignments`
| Field         | Type      | Notes                         |
|---------------|-----------|-------------------------------|
| AssignmentID  | AutoNumber| Primary Key                   |
| AssetID       | Number    | Foreign Key → tbl_Assets      |
| StaffID       | Number    | Foreign Key → tbl_Staff       |
| AssignedDate  | Date/Time |                               |

### Relationships
Create a **relationship** linking AssetID and StaffID (with referential
integrity enforced). This proves you understand keys/relationships.

### Query: `qry_AssetsInMaintenance`
```sql
SELECT AssetID, AssetName, Category, Status
FROM tbl_Assets
WHERE Status = "In Maintenance";
```

### Form: `frm_AssetEntry`
A simple single-record form bound to `tbl_Assets` for data entry.

### Report: `rpt_AssetsByStatus`
A report that groups or lists assets, based on `tbl_Assets`.

### Proof to keep:
- [ ] Screenshot of Relationships window
- [ ] Screenshot of the query in Design view + in Datasheet view showing results
- [ ] The `.accdb` file itself

---

## Finish — assemble everything

Put all finished files into ONE folder:

```
CSC396-MSOffice-Deliverables/
├── OJO_FAROUQ_CV.docx
├── MailMerge-Letter.docx          (merged output)
├── MailMerge-Recipients.xlsx
├── AssetInventory.xlsx
├── AssetInventory.xlsm            (macro version)
├── IAMTS-Defense.pptx
└── IAMTS-Demo.accdb
```

Then print two quick screenshots of Excel (formulas tab + chart) and of
the Access query, and add them to your CSC 396 Microsoft Report so the
panel can see the proof without opening the files.
