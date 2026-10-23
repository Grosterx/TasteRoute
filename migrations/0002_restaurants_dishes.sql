-- +goose Up
CREATE TABLE restaurants (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    address text NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    cuisine text NOT NULL DEFAULT '',
    image_url text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dishes (
    id uuid PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    price integer NOT NULL DEFAULT 0,
    tags text[] NOT NULL DEFAULT '{}',
    image_url text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dishes_restaurant_id_idx ON dishes(restaurant_id);
CREATE INDEX dishes_active_idx ON dishes(active);

-- +goose Down
DROP TABLE dishes;
DROP TABLE restaurants;
