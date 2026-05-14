CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255),
    password VARCHAR(255)
);

CREATE TABLE travel_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(100),
    full_name VARCHAR(255),
    country VARCHAR(255),
    start_date DATE,
    end_date DATE,
    purpose TEXT
);
