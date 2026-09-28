-- name: GetUserByEmail :one
SELECT id, email, password_hash, name, role, is_active
FROM users
WHERE lower(email) = lower(sqlc.arg(email));

-- name: GetUserPasswordHash :one
SELECT password_hash FROM users WHERE id = $1;

-- name: ListUsers :many
SELECT id, email, name, role, is_active, created_at
FROM users
ORDER BY is_active DESC, role, name;

-- name: GetUser :one
SELECT id, email, name, role, is_active, created_at
FROM users
WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, role)
VALUES (lower(sqlc.arg(email)), sqlc.arg(password_hash), sqlc.arg(name), sqlc.arg(role))
RETURNING id, email, name, role, is_active, created_at;

-- name: SetUserActive :exec
UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1;

-- name: SetUserPassword :exec
UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1;

-- name: CountOtherActiveOwners :one
SELECT count(*) FROM users WHERE role = 'owner' AND is_active AND id <> $1;

-- name: CountUsers :one
SELECT count(*) FROM users;
