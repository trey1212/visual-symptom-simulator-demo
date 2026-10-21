-- The menu of symptoms the app offers.
-- key is used by the code, clinical_name by the clinician view, plain_name by the patient view.
CREATE TABLE symptom_types (
    key           TEXT    PRIMARY KEY,
    clinical_name TEXT    NOT NULL,
    plain_name    TEXT    NOT NULL,
    drawable      BOOLEAN NOT NULL
);

INSERT INTO symptom_types (key, clinical_name, plain_name, drawable) VALUES
    ('blur',           'Defocus blur',     'Blurry',                      true),
    ('diplopia',       'Diplopia',         'Double vision',               false),
    ('scotoma',        'Scotoma',          'Dark or missing spots',       true),
    ('photopsia',      'Photopsia / aura', 'Flashing lights or zig-zags', true),
    ('visual_snow',    'Visual snow',      'Static or "snow"',            true),
    ('metamorphopsia', 'Metamorphopsia',   'Wavy or bent lines',          true),
    ('oscillopsia',    'Oscillopsia',      'Shaky or bouncing vision',    false);
