-- name: ListProductsWithStock :many
SELECT p.id, p.sku, p.name, p.price, p.low_stock_threshold, p.is_active,
       p.created_at, p.updated_at, b.on_hand, b.reserved
FROM products p
JOIN stock_balances b ON b.product_id = p.id
WHERE sqlc.narg(search)::text IS NULL
   OR p.name ILIKE '%' || sqlc.narg(search)::text || '%'
   OR p.sku ILIKE '%' || sqlc.narg(search)::text || '%'
ORDER BY p.sku
LIMIT 1000;

-- name: GetProductWithStock :one
SELECT p.id, p.sku, p.name, p.price, p.low_stock_threshold, p.is_active,
       p.created_at, p.updated_at, b.on_hand, b.reserved
FROM products p
JOIN stock_balances b ON b.product_id = p.id
WHERE p.id = $1;

-- name: CreateProduct :one
INSERT INTO products (sku, name, price, low_stock_threshold, is_active)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- name: CreateStockBalance :exec
INSERT INTO stock_balances (product_id) VALUES ($1);

-- name: UpdateProduct :one
UPDATE products
SET sku = $2,
    name = $3,
    price = $4,
    low_stock_threshold = $5,
    is_active = $6,
    updated_at = now()
WHERE id = $1
RETURNING id;

-- name: ListProductHolds :many
SELECT o.id AS order_id, o.order_no, o.channel, o.status, oi.qty, o.created_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.product_id = $1 AND o.status IN ('reserved', 'packed')
ORDER BY o.created_at, o.id;
