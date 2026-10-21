-- One symptom turned on for one eye in one session.
-- "Both eyes" in the UI saves two rows (left + right).
CREATE TYPE eye_side AS ENUM ('left', 'right');

CREATE TABLE session_layers (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    symptom_key   TEXT        NOT NULL REFERENCES symptom_types(key),
    eye           eye_side    NOT NULL,
    intensity     INTEGER     NOT NULL CHECK (intensity BETWEEN 0 AND 100),
    params        JSONB       NOT NULL DEFAULT '{}',   -- extra settings, e.g. {"template": "left_half"}
    drawn_strokes JSONB       NOT NULL DEFAULT '[]',   -- brush strokes, x/y from -1 to 1, centre = 0,0
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, symptom_key, eye)
);
