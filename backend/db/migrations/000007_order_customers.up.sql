ALTER TABLE orders
    ADD COLUMN customer_name    text,
    ADD COLUMN customer_phone   text,
    ADD COLUMN shipping_address text,
    ADD COLUMN line_user_id     text,
    ADD CONSTRAINT orders_line_user_needs_line_channel CHECK (line_user_id IS NULL OR channel = 'line');
