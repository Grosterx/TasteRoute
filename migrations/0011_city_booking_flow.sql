-- +goose Up
ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check CHECK (
        status IN ('new', 'contacted', 'confirmed', 'declined', 'completed', 'cancelled')
    );

CREATE TABLE booking_dishes (
    booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    PRIMARY KEY (booking_id, dish_id)
);

CREATE INDEX booking_dishes_dish_id_idx ON booking_dishes(dish_id);

-- +goose Down
DROP TABLE IF EXISTS booking_dishes;

ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings
    ADD CONSTRAINT bookings_status_check CHECK (
        status IN ('new', 'contacted', 'confirmed', 'declined', 'completed')
    );
