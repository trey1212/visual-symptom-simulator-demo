-- Background environments (2D images, 3D scenes, videos).
-- The files themselves live in storage; this table stores the path to them.
CREATE TYPE scene_type AS ENUM ('2d', '3d', 'video');

CREATE TABLE scenes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL UNIQUE,
    type       scene_type  NOT NULL,
    asset_path TEXT        NOT NULL,
    is_active  BOOLEAN     NOT NULL DEFAULT true,   -- false = hidden from the picker
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
