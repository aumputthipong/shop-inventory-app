CREATE TABLE stock_receipts (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reference  text,
    note       text,
    created_by bigint      REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
