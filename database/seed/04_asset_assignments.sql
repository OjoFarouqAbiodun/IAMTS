INSERT INTO asset_assignments
(
    asset_id,
    staff_id,
    assigned_by,
    assigned_date,
    assignment_status
)
VALUES

-- Mrs. K. Alagbala (Admin)

(3, 1, 1, '2025-01-10', 'Assigned'),
(6, 1, 1, '2025-01-10', 'Assigned'),

-- Mr. S. Adebayo (Technician)

(5, 2, 1, '2025-01-12', 'Assigned'),
(21, 2, 1, '2025-01-12', 'Assigned'),
(27, 2, 1, '2025-01-12', 'Assigned'),

-- Mr. O. Adeyemi (Technician)

(4, 3, 1, '2025-01-15', 'Assigned'),
(12, 3, 1, '2025-01-15', 'Assigned'),

-- Mrs. A. Ogunleye (Administration)

(1, 4, 1, '2025-01-18', 'Assigned'),
(15, 4, 1, '2025-01-18', 'Assigned'),
(8, 4, 1, '2025-01-18', 'Assigned'),

-- Mr. T. Oladipo (Finance)

(11, 5, 1, '2025-01-20', 'Assigned'),
(17, 5, 1, '2025-01-20', 'Assigned'),
(18, 5, 1, '2025-01-20', 'Assigned'),

-- Miss D. Akinola (Research & Innovation)

(13, 6, 1, '2025-01-22', 'Assigned'),
(20, 6, 1, '2025-01-22', 'Assigned');

UPDATE assets
SET status = 'Assigned'
WHERE id IN
(
3,
6,
5,
21,
27,
4,
12,
1,
15,
8,
11,
17,
18,
13,
20
);