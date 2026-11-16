-- +goose Up
ALTER TABLE bookings
    ADD COLUMN chain_id uuid,
    ADD COLUMN stop_order integer,
    ADD COLUMN route_id uuid REFERENCES routes(id) ON DELETE SET NULL;

ALTER TABLE bookings
    ADD CONSTRAINT bookings_stop_order_check CHECK (stop_order IS NULL OR stop_order BETWEEN 1 AND 3),
    ADD CONSTRAINT bookings_chain_fields_check CHECK (
        (chain_id IS NULL AND stop_order IS NULL)
        OR (chain_id IS NOT NULL AND stop_order IS NOT NULL)
    );

CREATE INDEX bookings_chain_id_idx ON bookings(chain_id);

-- +goose Down
DROP INDEX IF EXISTS bookings_chain_id_idx;

ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS bookings_chain_fields_check,
    DROP CONSTRAINT IF EXISTS bookings_stop_order_check;

ALTER TABLE bookings
    DROP COLUMN IF EXISTS route_id,
    DROP COLUMN IF EXISTS stop_order,
    DROP COLUMN IF EXISTS chain_id;
