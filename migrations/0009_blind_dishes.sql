-- +goose Up
ALTER TABLE dishes
    ADD COLUMN blind boolean NOT NULL DEFAULT false,
    ADD COLUMN blind_riddle text NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE dishes
    DROP COLUMN IF EXISTS blind_riddle,
    DROP COLUMN IF EXISTS blind;
