-- Clinicians and admins who log in. Patients do not have accounts.
CREATE TYPE user_role AS ENUM ('clinician', 'admin');

CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,          -- bcrypt/argon2 hash from Go, never the real password
    role          user_role   NOT NULL DEFAULT 'clinician',
    first_name    TEXT        NOT NULL,
    last_name     TEXT        NOT NULL,
    hospital      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One account per email, ignoring capital letters
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
