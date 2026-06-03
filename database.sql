/* ============================================================
   FTMS DATABASE SCHEMA
   Foreign Travel Management System
   Ministry of Agriculture
============================================================ */


/* ============================================================
   USERS TABLE
============================================================ */

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,

    role VARCHAR(100) NOT NULL DEFAULT 'traveler',

    phone VARCHAR(50),
    position VARCHAR(150),

    organization_type VARCHAR(100),
    organization_name VARCHAR(255),

    sector VARCHAR(150),
    department VARCHAR(150),

    account_status VARCHAR(30) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
   REQUESTS TABLE
============================================================ */

CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,

    traveler_category VARCHAR(100),
    organization_name VARCHAR(255),

    assigned_state_minister_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    current_stage VARCHAR(100) DEFAULT 'state_minister',
    final_status VARCHAR(50) DEFAULT 'pending',
    status VARCHAR(255) DEFAULT 'Pending',

    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(150),
    department VARCHAR(150),
    sector VARCHAR(150),

    country VARCHAR(150) NOT NULL,
    start_date DATE,
    end_date DATE,

    purpose TEXT,
    sponsor VARCHAR(255),

    passport_number VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),

    passport_file VARCHAR(255),
    invitation_letter VARCHAR(255),
    tor_file VARCHAR(255),

    amendment_comment TEXT,
    amended_by VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
   AFFILIATE INSTITUTIONS TABLE
============================================================ */

CREATE TABLE IF NOT EXISTS affiliate_institutions (
    id SERIAL PRIMARY KEY,

    organization_name VARCHAR(255) NOT NULL UNIQUE,
    general_director_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
   MINISTRY ORGANIZATIONS TABLE
============================================================ */

CREATE TABLE IF NOT EXISTS ministry_organizations (
    id SERIAL PRIMARY KEY,

    organization_name VARCHAR(255) NOT NULL UNIQUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
   NOTIFICATIONS TABLE
============================================================ */

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    user_email VARCHAR(255),
    title VARCHAR(255),
    message TEXT,

    is_read BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
   REQUEST AUDIT TRAILS TABLE
============================================================ */

CREATE TABLE IF NOT EXISTS request_audit_trails (
    id SERIAL PRIMARY KEY,

    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,

    action VARCHAR(100),
    actor_role VARCHAR(100),
    actor_email VARCHAR(255),
    comment TEXT,

    old_stage VARCHAR(100),
    new_stage VARCHAR(100),

    old_status VARCHAR(100),
    new_status VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================================================
   INDEXES FOR PERFORMANCE
============================================================ */

CREATE INDEX IF NOT EXISTS idx_users_email
ON users (LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_users_role
ON users (role);

CREATE INDEX IF NOT EXISTS idx_users_account_status
ON users (account_status);

CREATE INDEX IF NOT EXISTS idx_requests_email
ON requests (LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_requests_current_stage
ON requests (current_stage);

CREATE INDEX IF NOT EXISTS idx_requests_final_status
ON requests (final_status);

CREATE INDEX IF NOT EXISTS idx_requests_assigned_state_minister
ON requests (assigned_state_minister_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_email
ON notifications (user_email);

CREATE INDEX IF NOT EXISTS idx_audit_request_id
ON request_audit_trails (request_id);


/* ============================================================
   DEFAULT MINISTRY ORGANIZATION
============================================================ */

INSERT INTO ministry_organizations (organization_name)
VALUES ('Ministry of Agriculture')
ON CONFLICT (organization_name) DO NOTHING;


/* ============================================================
   OPTIONAL SAMPLE AFFILIATE INSTITUTIONS
   You can edit/remove these.
============================================================ */

INSERT INTO affiliate_institutions (
    organization_name,
    general_director_name,
    email,
    phone
)
VALUES
    ('Ethiopian Agricultural Authority', NULL, NULL, NULL),
    ('Ethiopian Institute of Agricultural Research', NULL, NULL, NULL)
ON CONFLICT (organization_name) DO NOTHING;