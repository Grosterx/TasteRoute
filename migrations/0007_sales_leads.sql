-- +goose Up
CREATE TABLE sales_leads (
    id uuid PRIMARY KEY,
    restaurant_name text NOT NULL,
    contact_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL DEFAULT '',
    city text NOT NULL DEFAULT 'Тольятти',
    message text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales_leads
    ADD CONSTRAINT sales_leads_status_check CHECK (
        status IN ('new', 'contacted', 'demo', 'won', 'lost')
    );

CREATE INDEX sales_leads_created_idx ON sales_leads(created_at DESC);
CREATE INDEX sales_leads_status_idx ON sales_leads(status);

-- +goose Down
DROP TABLE IF EXISTS sales_leads;
