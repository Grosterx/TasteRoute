-- +goose Up
CREATE TABLE bookings (
    id uuid PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text NOT NULL,
    party_size integer NOT NULL DEFAULT 2,
    requested_at timestamptz,
    comment text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'new',
    source text NOT NULL DEFAULT 'room',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (room_id, restaurant_id)
);

ALTER TABLE bookings
    ADD CONSTRAINT bookings_party_size_check CHECK (party_size BETWEEN 1 AND 20),
    ADD CONSTRAINT bookings_status_check CHECK (
        status IN ('new', 'contacted', 'confirmed', 'declined', 'completed')
    );

CREATE INDEX bookings_restaurant_created_idx ON bookings(restaurant_id, created_at DESC);
CREATE INDEX bookings_restaurant_status_idx ON bookings(restaurant_id, status);
CREATE INDEX bookings_room_id_idx ON bookings(room_id);

CREATE TABLE restaurant_views (
    id uuid PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    source text NOT NULL DEFAULT 'direct',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX restaurant_views_restaurant_created_idx ON restaurant_views(restaurant_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS restaurant_views;
DROP TABLE IF EXISTS bookings;
