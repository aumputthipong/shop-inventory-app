ALTER TABLE stock_movements
    ADD COLUMN reverses_id bigint REFERENCES stock_movements (id);

CREATE UNIQUE INDEX stock_movements_reverses_id_key ON stock_movements (reverses_id)
    WHERE reverses_id IS NOT NULL;
