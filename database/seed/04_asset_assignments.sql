INSERT INTO asset_assignments (asset_id, staff_id, assigned_by, assigned_date, assignment_status)
SELECT a.id, u.id, admin.id, '2025-01-10', 'Assigned'
FROM assets a JOIN users u ON u.email = 'kalagbala@iamts.com'
JOIN users admin ON admin.email = 'kalagbala@iamts.com'
WHERE a.asset_tag IN ('MIST-ICT-0003', 'MIST-ICT-0006')
AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.staff_id = u.id AND aa.assignment_status = 'Assigned');

INSERT INTO asset_assignments (asset_id, staff_id, assigned_by, assigned_date, assignment_status)
SELECT a.id, u.id, admin.id, '2025-01-12', 'Assigned'
FROM assets a JOIN users u ON u.email = 'sadebayo@iamts.com'
JOIN users admin ON admin.email = 'kalagbala@iamts.com'
WHERE a.asset_tag IN ('MIST-ICT-0005', 'MIST-ICT-0021', 'MIST-ICT-0027')
AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.staff_id = u.id AND aa.assignment_status = 'Assigned');

INSERT INTO asset_assignments (asset_id, staff_id, assigned_by, assigned_date, assignment_status)
SELECT a.id, u.id, admin.id, '2025-01-15', 'Assigned'
FROM assets a JOIN users u ON u.email = 'oadeyemi@iamts.com'
JOIN users admin ON admin.email = 'kalagbala@iamts.com'
WHERE a.asset_tag IN ('MIST-ICT-0004', 'MIST-ICT-0012')
AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.staff_id = u.id AND aa.assignment_status = 'Assigned');

INSERT INTO asset_assignments (asset_id, staff_id, assigned_by, assigned_date, assignment_status)
SELECT a.id, u.id, admin.id, '2025-01-18', 'Assigned'
FROM assets a JOIN users u ON u.email = 'aogunleye@iamts.com'
JOIN users admin ON admin.email = 'kalagbala@iamts.com'
WHERE a.asset_tag IN ('MIST-ICT-0001', 'MIST-ICT-0015', 'MIST-ICT-0008')
AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.staff_id = u.id AND aa.assignment_status = 'Assigned');

INSERT INTO asset_assignments (asset_id, staff_id, assigned_by, assigned_date, assignment_status)
SELECT a.id, u.id, admin.id, '2025-01-20', 'Assigned'
FROM assets a JOIN users u ON u.email = 'toladipo@iamts.com'
JOIN users admin ON admin.email = 'kalagbala@iamts.com'
WHERE a.asset_tag IN ('MIST-ICT-0011', 'MIST-ICT-0017', 'MIST-ICT-0018')
AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.staff_id = u.id AND aa.assignment_status = 'Assigned');

INSERT INTO asset_assignments (asset_id, staff_id, assigned_by, assigned_date, assignment_status)
SELECT a.id, u.id, admin.id, '2025-01-22', 'Assigned'
FROM assets a JOIN users u ON u.email = 'dakinola@iamts.com'
JOIN users admin ON admin.email = 'kalagbala@iamts.com'
WHERE a.asset_tag IN ('MIST-ICT-0013', 'MIST-ICT-0020')
AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.staff_id = u.id AND aa.assignment_status = 'Assigned');

UPDATE assets a
JOIN asset_assignments aa
	ON aa.asset_id = a.id
	AND aa.assignment_status = 'Assigned'
SET a.status = 'Assigned'
WHERE a.asset_tag LIKE 'MIST-ICT-%';

UPDATE assets a
LEFT JOIN asset_assignments aa
	ON aa.asset_id = a.id
	AND aa.assignment_status = 'Assigned'
SET a.status = 'In Stock'
WHERE a.asset_tag LIKE 'MIST-ICT-%'
	AND aa.id IS NULL
	AND a.status = 'Assigned';