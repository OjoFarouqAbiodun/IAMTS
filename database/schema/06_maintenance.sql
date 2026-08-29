CREATE TABLE maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,

    asset_id INT NOT NULL,

    reported_by INT NOT NULL,

    assigned_to INT NULL,

    problem_title VARCHAR(200) NOT NULL,

    problem_description TEXT NOT NULL,

    priority ENUM(
        'Low',
        'Medium',
        'High'
    ) DEFAULT 'Medium',

    maintenance_status ENUM(
        'Pending',
        'In Progress',
        'Completed',
        'Cancelled'
    ) NOT NULL DEFAULT 'Pending',

    remarks TEXT,

    date_reported TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    date_completed DATETIME NULL,

    date_cancelled DATETIME NULL,

    CONSTRAINT fk_maintenance_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(id),

    CONSTRAINT fk_maintenance_reporter
        FOREIGN KEY (reported_by)
        REFERENCES users(id),

    CONSTRAINT fk_maintenance_technician
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
);
