ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_line_user_needs_line_channel,
    DROP COLUMN IF EXISTS line_user_id,
    DROP COLUMN IF EXISTS shipping_address,
    DROP COLUMN IF EXISTS customer_phone,
    DROP COLUMN IF EXISTS customer_name;
