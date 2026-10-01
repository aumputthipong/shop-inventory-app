-- name: CreateReceipt :one
INSERT INTO stock_receipts (reference, note, created_by)
VALUES (sqlc.narg(reference), sqlc.narg(note), sqlc.narg(created_by))
RETURNING id, created_at;
