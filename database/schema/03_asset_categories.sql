CREATE TABLE asset_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,

    category_name VARCHAR(100) NOT NULL UNIQUE,

    status ENUM(
        'Active',
        'Inactive'
    ) DEFAULT 'Active'
);