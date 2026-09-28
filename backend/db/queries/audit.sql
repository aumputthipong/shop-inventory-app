-- name: InsertAuditLog :exec
INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail)
VALUES (sqlc.narg(actor_id), sqlc.arg(action), sqlc.arg(entity_type), sqlc.narg(entity_id), sqlc.arg(detail));

-- name: ListAuditLogs :many
SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, u.name AS actor_name, a.created_at
FROM audit_logs a
LEFT JOIN users u ON u.id = a.actor_id
ORDER BY a.created_at DESC, a.id DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CountAuditLogs :one
SELECT count(*) FROM audit_logs;
