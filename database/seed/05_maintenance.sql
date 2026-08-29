INSERT INTO maintenance
(
    asset_id,
    reported_by,
    assigned_to,
    problem_title,
    problem_description,
    priority,
    maintenance_status,
    remarks,
    date_reported,
    date_completed
)
VALUES

(
8,
4,
2,
'UPS not powering system',
'UPS battery drains immediately after power outage.',
'High',
'In Progress',
NULL,
'2025-06-02',
NULL
),

(
18,
5,
3,
'Printer paper jam',
'Printer frequently jams while printing reports.',
'Medium',
'Pending',
NULL,
'2025-06-05',
NULL
),

(
20,
6,
2,
'Projector not displaying',
'Projector powers on but displays a blank screen.',
'High',
'Pending',
NULL,
'2025-06-08',
NULL
),

(
27,
2,
2,
'External SSD not detected',
'System intermittently fails to detect SSD.',
'Medium',
'Completed',
'Firmware updated and drive tested successfully.',
'2025-05-15',
'2025-05-16'
),

(
5,
2,
3,
'Laptop overheating',
'Cooling fan making excessive noise.',
'High',
'Completed',
'Cooling fan replaced and thermal paste reapplied.',
'2025-04-20',
'2025-04-22'
),

(
11,
5,
2,
'Desktop slow performance',
'Desktop freezes during startup.',
'Low',
'Completed',
'Storage cleaned and RAM reseated.',
'2025-03-10',
'2025-03-11'
);

UPDATE assets
SET status = 'Under Maintenance'
WHERE id IN (8,18,20);