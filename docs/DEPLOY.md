# Online demo

The public demo runs the same Docker image as `docker compose --profile app`,
on Render's free plan, with the database on Neon's free plan and customer
ordering through a real LINE Official Account.

| Piece | Where | Cost |
|---|---|---|
| Api + built frontend | Render web service from `render.yaml` | Free; sleeps after about 15 idle minutes, the first visit then takes about a minute |
| PostgreSQL | Neon, region Singapore | Free |
| Customer ordering | LINE Official Account + LIFF, see [LINE-SETUP.md](LINE-SETUP.md) | Free |

The demo accounts are public: the README lists them and the login page shows
them with a button that fills the form, because `render.yaml` sets
`DEMO_ACCOUNTS`. A real shop leaves that unset and the box never appears. The
data is throwaway; `make demo-reset` puts it back to the sample shop at any
time.

## 1. Database on Neon

1. In an existing Neon project (or a new one in Singapore), create a database
   named `turtle_shop`.
2. Copy its **direct** connection string, not the pooled one. It ends in
   `?sslmode=require`.
3. Put it in the repo root `.env` (never committed):

   ```sh
   DEMO_DATABASE_URL=postgresql://...neon.tech/turtle_shop?sslmode=require
   ```

4. From `backend/`, create the schema and the sample shop:

   ```sh
   make demo-reset
   ```

   This drops everything in that database, runs every migration and seeds the
   demo accounts (`owner@demo.shop`, `staff@demo.shop`) with sample stock. It
   only ever touches `DEMO_DATABASE_URL`.

## 2. Web service on Render

1. Render dashboard > New > **Blueprint**, pick this repository. Render reads
   `render.yaml` and proposes a web service named `turtle-shop`.
2. Fill in the values marked "sync: false":
   - `DATABASE_URL`: the same Neon connection string
   - `LINE_LOGIN_CHANNEL_ID`, `LINE_LIFF_ID`, `LINE_CHANNEL_ACCESS_TOKEN`: the
     values from your local `.env`
3. Apply. The first build takes a few minutes. The service gets a fixed
   address such as `https://turtle-shop.onrender.com` (Render adds a suffix if
   the name is taken).
4. Check `https://<your-service>.onrender.com/healthz` answers
   `{"status":"ok","db":"ok"}`, then sign in as the demo owner.

Every push to `main` deploys again. The api does not run migrations itself:
after merging a new migration, run `make migrate-up DATABASE_URL=<demo url>`
from `backend/`, or `make demo-reset`.

## 3. Point LINE at the demo

In the LINE Developers Console, LINE Login channel:

1. LIFF tab > the app > Endpoint URL:
   `https://<your-service>.onrender.com/line`. The address is fixed, so this is
   a one-time change.
2. Publish the channel (it shows "Developing" at the top). Until then only you
   and the testers listed under Roles can sign in.
3. Optional: in LINE Official Account Manager, add a rich menu button linking
   to `https://liff.line.me/<LINE_LIFF_ID>` so visitors find the form from the
   chat.

A LIFF app has one endpoint. To keep trying LINE on your own machine through a
tunnel as well, add a second LIFF app for that and use its ID in the local
`.env`; otherwise run locally with `LINE_MODE=dev`.

## Before an interview

- Open the demo a few minutes early so the free instance is awake.
- Run `make demo-reset` if earlier visitors changed things, for example the
  owner password or the stock.
- The oversell story with one LINE account: a visitor puts the last hair dryer
  in their LINE cart, you sell it at the counter in the back office, then they
  confirm and are told it just sold out.
