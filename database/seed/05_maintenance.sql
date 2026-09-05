INSERT INTO maintenance (asset_id, reported_by, assigned_to, problem_title, problem_description, priority, maintenance_status, remarks, date_reported, date_completed)
SELECT a.id, reporter.id, technician.id, 'UPS not powering system', 'UPS battery drains immediately after power outage.', 'High', 'In Progress', NULL, '2025-06-02', NULL
FROM assets a JOIN users reporter ON reporter.email = 'aogunleye@iamts.com' JOIN users technician ON technician.email = 'sadebayo@iamts.com'
WHERE a.asset_tag = 'MIST-ICT-0008' AND NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.asset_id = a.id AND m.problem_title = 'UPS not powering system');

INSERT INTO maintenance (asset_id, reported_by, assigned_to, problem_title, problem_description, priority, maintenance_status, remarks, date_reported, date_completed)
SELECT a.id, reporter.id, technician.id, 'Printer paper jam', 'Printer frequently jams while printing reports.', 'Medium', 'Pending', NULL, '2025-06-05', NULL
FROM assets a JOIN users reporter ON reporter.email = 'toladipo@iamts.com' JOIN users technician ON technician.email = 'oadeyemi@iamts.com'
WHERE a.asset_tag = 'MIST-ICT-0018' AND NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.asset_id = a.id AND m.problem_title = 'Printer paper jam');

INSERT INTO maintenance (asset_id, reported_by, assigned_to, problem_title, problem_description, priority, maintenance_status, remarks, date_reported, date_completed)
SELECT a.id, reporter.id, technician.id, 'Projector not displaying', 'Projector powers on but displays a blank screen.', 'High', 'Pending', NULL, '2025-06-08', NULL
FROM assets a JOIN users reporter ON reporter.email = 'dakinola@iamts.com' JOIN users technician ON technician.email = 'sadebayo@iamts.com'
WHERE a.asset_tag = 'MIST-ICT-0020' AND NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.asset_id = a.id AND m.problem_title = 'Projector not displaying');

INSERT INTO maintenance (asset_id, reported_by, assigned_to, problem_title, problem_description, priority, maintenance_status, remarks, date_reported, date_completed)
SELECT a.id, reporter.id, technician.id, 'External SSD not detected', 'System intermittently fails to detect SSD.', 'Medium', 'Completed', 'Firmware updated and drive tested successfully.', '2025-05-15', '2025-05-16'
FROM assets a JOIN users reporter ON reporter.email = 'sadebayo@iamts.com' JOIN users technician ON technician.email = 'sadebayo@iamts.com'
WHERE a.asset_tag = 'MIST-ICT-0027' AND NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.asset_id = a.id AND m.problem_title = 'External SSD not detected');

INSERT INTO maintenance (asset_id, reported_by, assigned_to, problem_title, problem_description, priority, maintenance_status, remarks, date_reported, date_completed)
SELECT a.id, reporter.id, technician.id, 'Laptop overheating', 'Cooling fan making excessive noise.', 'High', 'Completed', 'Cooling fan replaced and thermal paste reapplied.', '2025-04-20', '2025-04-22'
FROM assets a JOIN users reporter ON reporter.email = 'sadebayo@iamts.com' JOIN users technician ON technician.email = 'oadeyemi@iamts.com'
WHERE a.asset_tag = 'MIST-ICT-0005' AND NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.asset_id = a.id AND m.problem_title = 'Laptop overheating');

INSERT INTO maintenance (asset_id, reported_by, assigned_to, problem_title, problem_description, priority, maintenance_status, remarks, date_reported, date_completed)
SELECT a.id, reporter.id, technician.id, 'Desktop slow performance', 'Desktop freezes during startup.', 'Low', 'Completed', 'Storage cleaned and RAM reseated.', '2025-03-10', '2025-03-11'
FROM assets a JOIN users reporter ON reporter.email = 'toladipo@iamts.com' JOIN users technician ON technician.email = 'sadebayo@iamts.com'
WHERE a.asset_tag = 'MIST-ICT-0011' AND NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.asset_id = a.id AND m.problem_title = 'Desktop slow performance');

UPDATE assets SET status = 'Under Maintenance'
WHERE asset_tag IN ('MIST-ICT-0008', 'MIST-ICT-0018', 'MIST-ICT-0020');

UPDATE assets a
LEFT JOIN asset_assignments aa
	ON aa.asset_id = a.id
	AND aa.assignment_status = 'Assigned'
LEFT JOIN maintenance m
	ON m.asset_id = a.id
	AND m.maintenance_status IN ('Pending', 'In Progress', 'Out of Service')
SET a.status = CASE
	WHEN m.id IS NOT NULL THEN 'Under Maintenance'
	WHEN aa.id IS NOT NULL THEN 'Assigned'
	ELSE 'In Stock'
END
WHERE a.status <> 'Retired';