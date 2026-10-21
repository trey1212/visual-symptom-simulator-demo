-- One run of the simulator. Anonymous: no patient information is stored.
CREATE TABLE sessions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,  -- clinician who ran it
    scene_id     UUID        NOT NULL REFERENCES scenes(id) ON DELETE RESTRICT,  -- background used
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ                                                      -- empty until handed back
);
