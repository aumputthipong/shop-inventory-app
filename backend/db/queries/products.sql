-- name: GetProduct :one
SELECT id, sku, name, price, low_stock_threshold, is_active, created_at, updated_at
FROM products
WHERE id = $1;

-- name: ListProducts :many
SELECT id, sku, name, price, low_stock_threshold, is_active, created_at, updated_at
FROM products
ORDER BY id
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateProduct :one
INSERT INTO products (sku, name, price, low_stock_threshold)
VALUES ($1, $2, $3, $4)
RETURNING id, sku, name, price, low_stock_threshold, is_active, created_at, updated_at;
