-- +goose Up
ALTER TABLE restaurants
    ADD COLUMN slug text,
    ADD COLUMN city text NOT NULL DEFAULT 'Тольятти',
    ADD COLUMN description text NOT NULL DEFAULT '',
    ADD COLUMN phone text NOT NULL DEFAULT '',
    ADD COLUMN website text NOT NULL DEFAULT '',
    ADD COLUMN hours text NOT NULL DEFAULT '',
    ADD COLUMN cover_url text NOT NULL DEFAULT '',
    ADD COLUMN plan text NOT NULL DEFAULT 'pilot',
    ADD COLUMN plan_status text NOT NULL DEFAULT 'trial',
    ADD COLUMN trial_ends_at timestamptz,
    ADD COLUMN featured boolean NOT NULL DEFAULT false,
    ADD COLUMN is_demo boolean NOT NULL DEFAULT false,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

UPDATE restaurants
SET slug = 'rest-' || right(replace(id::text, '-', ''), 8)
WHERE slug IS NULL;

ALTER TABLE restaurants ALTER COLUMN slug SET NOT NULL;

ALTER TABLE restaurants
    ADD CONSTRAINT restaurants_plan_check CHECK (plan IN ('pilot', 'basic', 'pro')),
    ADD CONSTRAINT restaurants_plan_status_check CHECK (plan_status IN ('trial', 'active', 'paused', 'cancelled'));

CREATE UNIQUE INDEX restaurants_slug_key ON restaurants(slug);
CREATE INDEX restaurants_city_active_idx ON restaurants(city, active);

CREATE TABLE restaurant_accounts (
    id uuid PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'owner',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
);

CREATE UNIQUE INDEX restaurant_accounts_email_key ON restaurant_accounts(lower(email));
CREATE INDEX restaurant_accounts_restaurant_id_idx ON restaurant_accounts(restaurant_id);

ALTER TABLE dishes
    ADD COLUMN category text NOT NULL DEFAULT '',
    ADD COLUMN sort_order integer NOT NULL DEFAULT 0,
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX dishes_restaurant_menu_idx ON dishes(restaurant_id, active, sort_order, name);

-- +goose Down
DROP INDEX IF EXISTS dishes_restaurant_menu_idx;
ALTER TABLE dishes
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS sort_order,
    DROP COLUMN IF EXISTS category;

DROP TABLE IF EXISTS restaurant_accounts;

DROP INDEX IF EXISTS restaurants_city_active_idx;
DROP INDEX IF EXISTS restaurants_slug_key;

ALTER TABLE restaurants
    DROP CONSTRAINT IF EXISTS restaurants_plan_status_check,
    DROP CONSTRAINT IF EXISTS restaurants_plan_check,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS is_demo,
    DROP COLUMN IF EXISTS featured,
    DROP COLUMN IF EXISTS trial_ends_at,
    DROP COLUMN IF EXISTS plan_status,
    DROP COLUMN IF EXISTS plan,
    DROP COLUMN IF EXISTS cover_url,
    DROP COLUMN IF EXISTS hours,
    DROP COLUMN IF EXISTS website,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS slug;
