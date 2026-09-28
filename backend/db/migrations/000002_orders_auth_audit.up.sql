CREATE TABLE sessions (
    token_hash bytea       PRIMARY KEY,
    user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE SEQUENCE order_number_seq;

CREATE TABLE orders (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_no     text           NOT NULL UNIQUE
        DEFAULT 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 5, '0'),
    channel      text           NOT NULL CHECK (channel IN ('store', 'shopee', 'line')),
    external_ref text,
    status       text           NOT NULL CHECK (status IN ('reserved', 'packed', 'shipped', 'canceled')),
    total        numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    note         text,
    created_by   bigint         REFERENCES users (id) ON DELETE SET NULL,
    created_at   timestamptz    NOT NULL DEFAULT now(),
    updated_at   timestamptz    NOT NULL DEFAULT now(),
    packed_at    timestamptz,
    shipped_at   timestamptz,
    canceled_at  timestamptz
);

CREATE INDEX orders_created_at_idx ON orders (created_at DESC, id DESC);
CREATE INDEX orders_status_idx ON orders (status);
CREATE UNIQUE INDEX orders_channel_external_ref_key ON orders (channel, external_ref)
    WHERE external_ref IS NOT NULL;

CREATE TABLE order_items (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   bigint         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id bigint         NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    qty        integer        NOT NULL CHECK (qty > 0),
    unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
    UNIQUE (order_id, product_id)
);

CREATE INDEX order_items_product_id_idx ON order_items (product_id);

CREATE TABLE audit_logs (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    bigint      REFERENCES users (id) ON DELETE SET NULL,
    action      text        NOT NULL,
    entity_type text        NOT NULL,
    entity_id   bigint,
    detail      jsonb       NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC, id DESC);

ALTER TABLE stock_movements
    ADD COLUMN note           text,
    ADD COLUMN on_hand_after  integer NOT NULL DEFAULT 0,
    ADD COLUMN reserved_after integer NOT NULL DEFAULT 0;

ALTER TABLE stock_movements
    ALTER COLUMN on_hand_after DROP DEFAULT,
    ALTER COLUMN reserved_after DROP DEFAULT,
    ADD CONSTRAINT stock_movements_ref_pair CHECK ((ref_type IS NULL) = (ref_id IS NULL)),
    ADD CONSTRAINT stock_movements_adjust_needs_reason
        CHECK (type <> 'ADJUST' OR (reason IS NOT NULL AND btrim(reason) <> ''));

CREATE INDEX stock_movements_created_at_idx ON stock_movements (created_at DESC, id DESC);
CREATE INDEX stock_movements_ref_idx ON stock_movements (ref_type, ref_id);
