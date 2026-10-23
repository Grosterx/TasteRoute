-- +goose Up
CREATE TABLE rooms (
    id uuid PRIMARY KEY,
    code text NOT NULL UNIQUE,
    city text NOT NULL,
    start_lat double precision NOT NULL,
    start_lon double precision NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participants (
    id uuid PRIMARY KEY,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX participants_room_id_idx ON participants(room_id);

-- +goose Down
DROP TABLE participants;
DROP TABLE rooms;
