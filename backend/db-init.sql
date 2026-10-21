-- Runs automatically the first time the database is created.
-- When you add a new migration, add a line for it here.
\i /migrations/000001_create_users.up.sql
\i /migrations/000002_create_scenes.up.sql
\i /migrations/000003_create_symptom_types.up.sql
\i /migrations/000004_create_sessions.up.sql
\i /migrations/000005_create_session_layers.up.sql
\i /migrations/000006_create_snapshots.up.sql
\i /seeds/seed.sql