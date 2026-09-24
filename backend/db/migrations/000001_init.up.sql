-- Initial schema.
--
-- Stock correctness is enforced here as well as in Go: whatever code path
-- writes stock_balances, the database refuses a row where reserved exceeds
-- on_hand. That constraint is what ultimately prevents overselling.

CREATE TABLE users (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         text        NOT NULL UNIQUE,
    password_hash text        NOT NULL,
    name          text        NOT NULL,
    role          text        NOT NULL CHECK (role IN ('owner', 'staff')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku                 text          NOT NULL UNIQUE,
    name                text          NOT NULL,
    price               numeric(12, 2) NOT NULL CHECK (price >= 0),
    low_stock_threshold integer       NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
    is_active           boolean       NOT NULL DEFAULT true,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- One row per product. available = on_hand - reserved is derived, never
-- stored, so it cannot drift. version supports optimistic locking.
CREATE TABLE stock_balances (
    product_id bigint      PRIMARY KEY REFERENCES products (id) ON DELETE CASCADE,
    on_hand    integer     NOT NULL DEFAULT 0,
    reserved   integer     NOT NULL DEFAULT 0,
    version    integer     NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT stock_balances_on_hand_non_negative  CHECK (on_hand >= 0),
    CONSTRAINT stock_balances_reserved_non_negative CHECK (reserved >= 0),
    CONSTRAINT stock_balances_available_non_negative CHECK (on_hand - reserved >= 0)
);

-- Append-only ledger. Every change to stock_balances is explained by a row
-- here, which makes the balance auditable and reconstructable.
CREATE TABLE stock_movements (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id      bigint      NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    type            text        NOT NULL CHECK (type IN ('STOCK_IN', 'ADJUST', 'RESERVE', 'RELEASE', 'SHIP', 'RETURN')),
    qty_change      integer     NOT NULL DEFAULT 0,
    reserved_change integer     NOT NULL DEFAULT 0,
    ref_type        text,
    ref_id          bigint,
    reason          text,
    created_by      bigint      REFERENCES users (id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stock_movements_product_id_created_at_idx
    ON stock_movements (product_id, created_at);
