CREATE TABLE assets (
    id INT AUTO_INCREMENT PRIMARY KEY,

    asset_tag VARCHAR(50) NOT NULL UNIQUE,

    barcode VARCHAR(100) UNIQUE,

    asset_name VARCHAR(150) NOT NULL,

    category_id INT NOT NULL,

    brand VARCHAR(100),

    model VARCHAR(100),

    serial_number VARCHAR(100) UNIQUE,

    purchase_date DATE,

    asset_condition ENUM(
        'Excellent',
        'Good',
        'Fair',
        'Poor'
    ) DEFAULT 'Good',

    location VARCHAR(150),

    status ENUM(
        'In Stock',
        'Assigned',
        'Under Maintenance',
        'Retired'
    ) DEFAULT 'In Stock',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assets_category
        FOREIGN KEY (category_id)
        REFERENCES asset_categories(id)
);