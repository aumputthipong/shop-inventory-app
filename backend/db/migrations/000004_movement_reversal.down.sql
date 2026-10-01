DROP INDEX IF EXISTS stock_movements_reverses_id_key;
ALTER TABLE stock_movements DROP COLUMN IF EXISTS reverses_id;
