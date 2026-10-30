-- +goose Up
ALTER TABLE restaurant_accounts
    ADD COLUMN token_version integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS swipes_room_dish_liked_idx ON swipes(room_id, dish_id, liked);
CREATE INDEX IF NOT EXISTS swipes_created_at_idx ON swipes(created_at);
CREATE INDEX IF NOT EXISTS matches_created_at_idx ON matches(created_at);
CREATE INDEX IF NOT EXISTS restaurant_views_source_created_idx
    ON restaurant_views(restaurant_id, source, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_restaurant_status_created_idx
    ON bookings(restaurant_id, status, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS bookings_restaurant_status_created_idx;
DROP INDEX IF EXISTS restaurant_views_source_created_idx;
DROP INDEX IF EXISTS matches_created_at_idx;
DROP INDEX IF EXISTS swipes_created_at_idx;
DROP INDEX IF EXISTS swipes_room_dish_liked_idx;

ALTER TABLE restaurant_accounts
    DROP COLUMN IF EXISTS token_version;
