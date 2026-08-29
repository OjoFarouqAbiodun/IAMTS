CREATE TABLE asset_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    asset_id INT NOT NULL,

    staff_id INT NOT NULL,

    assigned_by INT NOT NULL,

    assigned_date DATETIME NOT NULL,

    returned_by INT NULL,

    returned_date DATETIME NULL,

    assignment_status ENUM(
        'Assigned',
        'Returned'
    ) DEFAULT 'Assigned',

    CONSTRAINT fk_assignment_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(id),

    CONSTRAINT fk_assignment_staff
        FOREIGN KEY (staff_id)
        REFERENCES users(id),

    CONSTRAINT fk_assignment_admin
        FOREIGN KEY (assigned_by)
        REFERENCES users(id),

    CONSTRAINT fk_assignment_returned
        FOREIGN KEY (returned_by)
        REFERENCES users(id)
);