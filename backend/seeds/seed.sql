-- Starting data for local development. Run AFTER all migrations.
-- Safe to run more than once.

-- scenes, asset_path is relative to the backend/data folder
-- if a scene with the same name already exists it gets updated instead (so running this again fixes old rows)
INSERT INTO scenes (name, type, asset_path) VALUES
    ('Reading page',                '2d',    'images/reading-page.png'),
    ('Open book',                   '2d',    'images/open-book.jpg'),
    ('City traffic (driver view)',  '2d',    'images/city-traffic-driver-view.jpg'),
    ('Night street',                '2d',    'images/night-street.jpg'),
    ('Park path',                   '2d',    'images/park-path.jpg'),
    ('Beach',                       '2d',    'images/beach.jpg'),
    ('Kitchen',                     '2d',    'images/kitchen.jpg'),
    ('City sidewalk walk (winter)', 'video', 'videos/city-sidewalk-walk-pov.mp4'),
    ('Forest walk',                 'video', 'videos/forest-walk-pov.mp4'),
    ('Scooter ride',                'video', 'videos/scooter-ride-pov.mp4'),
    ('Night driving',               'video', 'videos/night-driving-pov.mp4')
ON CONFLICT (name) DO UPDATE
SET type       = EXCLUDED.type,
    asset_path = EXCLUDED.asset_path,
    is_active  = true;

-- Test clinician for development only. The hash is fake, so this account can't log in.
INSERT INTO users (email, password_hash, role, first_name, last_name, hospital)
SELECT 'test.clinician@example.com', 'not-a-real-hash', 'clinician', 'Test', 'Clinician', 'Dev Hospital'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE lower(email) = 'test.clinician@example.com'
);
