# Code notes

Why the code is the way it is, grouped by area. Rules live in `CLAUDE.md`; this
file holds the reasoning that would otherwise end up in comments. Update a note
in the same PR as the behaviour it describes.

## Backend: startup and shutdown

- `run()` returns an error instead of exiting so that every `defer` in it runs.
  `os.Exit` in `main` would skip them.
- `database.NewPool` pings before returning, so a wrong `DATABASE_URL` fails at
  startup instead of on the first request.
- Shutdown uses a fresh `context.Background()` with its own timeout. The signal
  context is already canceled by then and would abort the drain immediately.

## Backend: http

- `httpx.NewRouter` returns `http.Handler`, not `*gin.Engine`, so `cmd/api`
  never imports gin.
- `Recovery` replaces `gin.Recovery` so a panic produces the same JSON envelope
  and log format as every other error. A broken pipe is logged at warn and not
  answered, since the client is gone.
- `RequestLogger` picks the log level from the response status (5xx error, 4xx
  warn), so failures can be filtered by level.
- The request id is echoed in `X-Request-ID` and in every error body, so a
  failed request can be traced from the client to the log line.
- Error `code` values are the contract clients branch on; `message` is for
  humans and may change.

## Backend: health

- `/healthz` answers 503 when the database is unreachable, so a load balancer
  takes the instance out of rotation instead of sending it traffic.
- The database ping is capped at 2s so a hung database cannot hold the
  endpoint open past a load balancer's own timeout.

## Frontend

- `apiFetch` takes `acceptStatuses` for non-2xx responses whose body is still
  data. `/healthz` answering 503 is a health report, not a failure.
- The vite dev server proxies `/api` and `/healthz` to the Go api, so requests
  are same-origin in development and the api needs no CORS setup. Set
  `VITE_API_PROXY_TARGET` when the api runs elsewhere.
- ESLint allows numbers in template strings; the strict default only forces
  `String(status)` noise.
- Route files and shadcn/ui components have `react-refresh/only-export-components`
  off: the router's autoCodeSplitting moves route components into their own
  module, and shadcn exports cva variant helpers by design.

## Tooling

- `.gitattributes` forces LF because `core.autocrlf=true` on Windows checks
  files out with CRLF, and gofmt and prettier then flag every file.
- The Go toolchain pin is explained under "Version pins" in `CLAUDE.md`.
