-- Reverse of 000001_init.up.sql, dropping dependents before what they reference.
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS stock_balances;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
