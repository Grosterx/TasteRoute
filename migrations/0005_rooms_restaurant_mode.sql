-- +goose Up
ALTER TABLE rooms
    ADD COLUMN restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
    ADD COLUMN mode text NOT NULL DEFAULT 'city',
    ADD COLUMN source text NOT NULL DEFAULT 'direct';

ALTER TABLE rooms
    ADD CONSTRAINT rooms_mode_check CHECK (mode IN ('city', 'restaurant')),
    ADD CONSTRAINT rooms_restaurant_mode_check CHECK (
        (mode = 'restaurant' AND restaurant_id IS NOT NULL) OR mode = 'city'
    );

CREATE INDEX rooms_restaurant_id_idx ON rooms(restaurant_id);
CREATE INDEX rooms_restaurant_created_idx ON rooms(restaurant_id, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS rooms_restaurant_created_idx;
DROP INDEX IF EXISTS rooms_restaurant_id_idx;

ALTER TABLE rooms
    DROP CONSTRAINT IF EXISTS rooms_restaurant_mode_check,
    DROP CONSTRAINT IF EXISTS rooms_mode_check,
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS mode,
    DROP COLUMN IF EXISTS restaurant_id;
