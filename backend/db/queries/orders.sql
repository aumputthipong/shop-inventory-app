-- name: CreateOrder :one
INSERT INTO orders (
    channel, external_ref, status, note, created_by,
    customer_name, customer_phone, shipping_address, line_user_id
) VALUES (
    sqlc.arg(channel), sqlc.narg(external_ref), 'reserved', sqlc.narg(note), sqlc.narg(created_by),
    sqlc.narg(customer_name), sqlc.narg(customer_phone), sqlc.narg(shipping_address), sqlc.narg(line_user_id)
)
RETURNING id, order_no;

-- name: InsertOrderItem :exec
INSERT INTO order_items (order_id, product_id, qty, unit_price)
VALUES ($1, $2, $3, $4);

-- name: RefreshOrderTotal :exec
UPDATE orders o
SET total = (SELECT coalesce(sum(oi.qty * oi.unit_price), 0) FROM order_items oi WHERE oi.order_id = o.id)
WHERE o.id = $1;

-- name: LockOrder :one
SELECT id, order_no, status
FROM orders
WHERE id = $1
FOR UPDATE;

-- name: SetOrderStatus :exec
UPDATE orders
SET status = sqlc.arg(status)::text,
    updated_at = now(),
    packed_at = CASE WHEN sqlc.arg(status)::text = 'packed' THEN now() ELSE packed_at END,
    shipped_at = CASE WHEN sqlc.arg(status)::text = 'shipped' THEN now() ELSE shipped_at END,
    canceled_at = CASE WHEN sqlc.arg(status)::text = 'canceled' THEN now() ELSE canceled_at END
WHERE id = sqlc.arg(id);

-- name: GetOrder :one
SELECT o.id, o.order_no, o.channel, o.external_ref, o.status, o.total, o.note,
       u.name AS created_by_name, o.created_at, o.updated_at,
       o.packed_at, o.shipped_at, o.canceled_at,
       o.customer_name, o.customer_phone, o.shipping_address, o.line_user_id
FROM orders o
LEFT JOIN users u ON u.id = o.created_by
WHERE o.id = $1;

-- name: ListOrderItems :many
SELECT oi.product_id, p.sku, p.name, oi.qty, oi.unit_price
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = $1
ORDER BY oi.id;

-- name: ListOrders :many
SELECT o.id, o.order_no, o.channel, o.external_ref, o.status, o.total,
       u.name AS created_by_name, o.created_at,
       (SELECT coalesce(sum(qty), 0)::integer FROM order_items WHERE order_id = o.id) AS item_count
FROM orders o
LEFT JOIN users u ON u.id = o.created_by
WHERE (sqlc.narg(status)::text IS NULL OR o.status = sqlc.narg(status)::text)
  AND (sqlc.narg(search)::text IS NULL OR o.order_no ILIKE '%' || sqlc.narg(search)::text || '%'
       OR o.external_ref ILIKE '%' || sqlc.narg(search)::text || '%')
ORDER BY o.created_at DESC, o.id DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountOrders :one
SELECT count(*)
FROM orders o
WHERE (sqlc.narg(status)::text IS NULL OR o.status = sqlc.narg(status)::text)
  AND (sqlc.narg(search)::text IS NULL OR o.order_no ILIKE '%' || sqlc.narg(search)::text || '%'
       OR o.external_ref ILIKE '%' || sqlc.narg(search)::text || '%');
