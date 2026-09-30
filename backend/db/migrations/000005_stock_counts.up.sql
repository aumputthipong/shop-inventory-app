CREATE TABLE stock_counts (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status     text        NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected')),
    note       text,
    created_by bigint      REFERENCES users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    decided_by bigint      REFERENCES users (id) ON DELETE SET NULL,
    decided_at timestamptz
);

CREATE INDEX stock_counts_created_at_idx ON stock_counts (created_at DESC, id DESC);

CREATE TABLE stock_count_lines (
    count_id   bigint  NOT NULL REFERENCES stock_counts (id) ON DELETE CASCADE,
    product_id bigint  NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    expected   integer NOT NULL CHECK (expected >= 0),
    counted    integer NOT NULL CHECK (counted >= 0),
    PRIMARY KEY (count_id, product_id)
);
