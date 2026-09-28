-- name: GetUserByEmail :one
SELECT id, email, password_hash, name, role, created_at, updated_at
FROM users
WHERE lower(email) = lower(sqlc.arg(email));

-- name: ListUsers :many
SELECT id, email, name, role, created_at
FROM users
ORDER BY role, name;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, role)
VALUES (lower(sqlc.arg(email)), sqlc.arg(password_hash), sqlc.arg(name), sqlc.arg(role))
RETURNING id, email, name, role, created_at;

-- name: CountUsers :one
SELECT count(*) FROM users;
