-- Time evolution: frozen copies of a session's layers at points in an episode
-- (e.g. an aura at 0, 10 and 25 minutes).
CREATE TABLE snapshots (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    minutes_from_start INTEGER     NOT NULL CHECK (minutes_from_start >= 0),
    label              TEXT,                    -- optional, e.g. 'Peak'
    layers             JSONB       NOT NULL,    -- copy of the session's layer rows at that moment
    image_path         TEXT,                    -- exported PNG, if one was made
    captured_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, minutes_from_start)
);
