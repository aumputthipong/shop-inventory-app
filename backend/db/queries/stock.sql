-- name: LockStockRows :many
SELECT b.product_id, b.on_hand, b.reserved, p.sku, p.name, p.price, p.is_active
FROM stock_balances b
JOIN products p ON p.id = b.product_id
WHERE b.product_id = ANY(sqlc.arg(product_ids)::bigint[])
ORDER BY b.product_id
FOR UPDATE OF b;

-- name: ApplyBalanceChange :one
UPDATE stock_balances
SET on_hand = on_hand + sqlc.arg(qty_change),
    reserved = reserved + sqlc.arg(reserved_change),
    version = version + 1,
    updated_at = now()
WHERE product_id = sqlc.arg(product_id)
RETURNING on_hand, reserved;

-- name: InsertMovement :one
INSERT INTO stock_movements (
    product_id, type, qty_change, reserved_change, ref_type, ref_id,
    reason, note, created_by, on_hand_after, reserved_after, reverses_id
) VALUES (
    sqlc.arg(product_id), sqlc.arg(type), sqlc.arg(qty_change), sqlc.arg(reserved_change),
    sqlc.narg(ref_type), sqlc.narg(ref_id), sqlc.narg(reason), sqlc.narg(note),
    sqlc.narg(created_by), sqlc.arg(on_hand_after), sqlc.arg(reserved_after), sqlc.narg(reverses_id)
)
RETURNING id, created_at;

-- name: ListMovements :many
SELECT m.id, m.product_id, p.sku, p.name AS product_name, m.type, m.qty_change,
       m.reserved_change, m.on_hand_after, m.reserved_after, m.ref_type, m.ref_id,
       o.order_no, o.channel AS order_channel, m.reason, m.note, u.name AS created_by_name,
       m.created_at, m.reverses_id,
       EXISTS (SELECT 1 FROM stock_movements r WHERE r.reverses_id = m.id) AS reversed,
       sr.reference AS receipt_reference
FROM stock_movements m
JOIN products p ON p.id = m.product_id
LEFT JOIN orders o ON m.ref_type = 'order' AND o.id = m.ref_id
LEFT JOIN stock_receipts sr ON m.ref_type = 'receipt' AND sr.id = m.ref_id
LEFT JOIN users u ON u.id = m.created_by
WHERE (sqlc.narg(product_id)::bigint IS NULL OR m.product_id = sqlc.narg(product_id)::bigint)
  AND (sqlc.narg(type)::text IS NULL OR m.type = sqlc.narg(type)::text)
ORDER BY m.created_at DESC, m.id DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountMovements :one
SELECT count(*)
FROM stock_movements m
WHERE (sqlc.narg(product_id)::bigint IS NULL OR m.product_id = sqlc.narg(product_id)::bigint)
  AND (sqlc.narg(type)::text IS NULL OR m.type = sqlc.narg(type)::text);

-- name: GetMovement :one
SELECT m.id, m.product_id, m.type, m.qty_change, m.reserved_change, m.ref_type, m.reverses_id,
       m.created_at,
       EXISTS (SELECT 1 FROM stock_movements r WHERE r.reverses_id = m.id) AS reversed
FROM stock_movements m
WHERE m.id = $1;
