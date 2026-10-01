DROP INDEX IF EXISTS stock_movements_ref_idx;
DROP INDEX IF EXISTS stock_movements_created_at_idx;

ALTER TABLE stock_movements
    DROP CONSTRAINT IF EXISTS stock_movements_adjust_needs_reason,
    DROP CONSTRAINT IF EXISTS stock_movements_ref_pair,
    DROP COLUMN IF EXISTS reserved_after,
    DROP COLUMN IF EXISTS on_hand_after,
    DROP COLUMN IF EXISTS note;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP SEQUENCE IF EXISTS order_number_seq;
DROP TABLE IF EXISTS sessions;
