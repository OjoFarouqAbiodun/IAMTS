CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,

    email VARCHAR(100) NOT NULL UNIQUE,

    phone_number VARCHAR(20),

    password VARCHAR(255) NOT NULL,

    role ENUM(
        'Admin',
        'Technician',
        'Staff'
    ) NOT NULL,

    department VARCHAR(100),

    status ENUM(
        'Active',
        'Inactive'
    ) DEFAULT 'Active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);