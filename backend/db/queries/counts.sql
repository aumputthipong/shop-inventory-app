-- name: CreateCount :one
INSERT INTO stock_counts (status, note, created_by)
VALUES ('submitted', sqlc.narg(note), sqlc.narg(created_by))
RETURNING id;

-- name: InsertCountLine :execrows
INSERT INTO stock_count_lines (count_id, product_id, expected, counted)
SELECT sqlc.arg(count_id), b.product_id, b.on_hand, sqlc.arg(counted)
FROM stock_balances b
WHERE b.product_id = sqlc.arg(product_id);

-- name: LockCount :one
SELECT id, status FROM stock_counts WHERE id = $1 FOR UPDATE;

-- name: DecideCount :exec
UPDATE stock_counts
SET status = sqlc.arg(status), decided_by = sqlc.narg(decided_by), decided_at = now()
WHERE id = sqlc.arg(id);

-- name: GetCount :one
SELECT c.id, c.status, c.note, c.created_at, c.decided_at,
       cu.name AS created_by_name, du.name AS decided_by_name
FROM stock_counts c
LEFT JOIN users cu ON cu.id = c.created_by
LEFT JOIN users du ON du.id = c.decided_by
WHERE c.id = $1;

-- name: ListCountLines :many
SELECT l.product_id, p.sku, p.name, l.expected, l.counted, b.on_hand AS on_hand_now
FROM stock_count_lines l
JOIN products p ON p.id = l.product_id
JOIN stock_balances b ON b.product_id = l.product_id
WHERE l.count_id = $1
ORDER BY p.sku;

-- name: ListCounts :many
SELECT c.id, c.status, c.note, c.created_at, c.decided_at,
       cu.name AS created_by_name,
       (SELECT count(*) FROM stock_count_lines l WHERE l.count_id = c.id) AS line_count,
       (SELECT count(*) FROM stock_count_lines l WHERE l.count_id = c.id AND l.counted <> l.expected) AS diff_count
FROM stock_counts c
LEFT JOIN users cu ON cu.id = c.created_by
WHERE (sqlc.narg(status)::text IS NULL OR c.status = sqlc.narg(status)::text)
ORDER BY c.created_at DESC, c.id DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountCounts :one
SELECT count(*) FROM stock_counts c
WHERE (sqlc.narg(status)::text IS NULL OR c.status = sqlc.narg(status)::text);
