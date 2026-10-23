-- +goose Up
CREATE TABLE swipes (
    id uuid PRIMARY KEY,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    liked boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (participant_id, dish_id)
);

CREATE INDEX swipes_room_id_idx ON swipes(room_id);
CREATE INDEX swipes_dish_id_idx ON swipes(dish_id);

CREATE TABLE matches (
    id uuid PRIMARY KEY,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    likes bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (room_id, dish_id)
);

CREATE INDEX matches_room_id_idx ON matches(room_id);

CREATE TABLE routes (
    id uuid PRIMARY KEY,
    room_id uuid NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
    stops jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
    id uuid PRIMARY KEY,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
    participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text NOT NULL,
    comment text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leads_created_at_idx ON leads(created_at DESC);

-- +goose Down
DROP TABLE leads;
DROP TABLE routes;
DROP TABLE matches;
DROP TABLE swipes;
