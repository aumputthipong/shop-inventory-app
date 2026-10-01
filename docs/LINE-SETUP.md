# Ordering through LINE

Customers open a form inside LINE, pick products and order. The order lands on
the same stock as the store and Shopee, and the customer gets a LINE message
when it is placed, packed, shipped or canceled.

There are three modes, set with `LINE_MODE`:

| Mode | What happens | Needs |
|---|---|---|
| `off` | `/line` says the shop does not take LINE orders | nothing |
| `dev` | Sign-in is faked and messages go to the api log | nothing; refused in production |
| `live` | Real LINE sign-in and real messages | the three LINE values below |

## Try it without LINE (dev mode)

`dev` is the default when `APP_ENV=development`.

1. Run the api and the frontend as in the README.
2. Open <http://localhost:5173/line>. You are the customer "ลูกค้าทดลอง".
3. Add `?as=<name>` to be someone else, for example `/line?as=ploy` in one
   window and `/line?as=nat` in another. Both racing for the last unit shows
   the oversell protection: one order wins, the other is told it sold out.
4. The messages a real customer would get appear in the api log as
   `line message not sent in dev mode`.
5. Orders show up in the back office under ออเดอร์ with a "ส่งถึง" card.

## Go live

Everything below is free. You need a LINE account and a public HTTPS URL.

### 1. Official Account and Messaging API

1. Create a LINE Official Account at <https://manager.line.biz>.
2. In the account: Settings > Messaging API > Enable. Pick or create a
   **provider** and remember it; the next step must use the same one.
3. In the [LINE Developers Console](https://developers.line.biz/console/), open
   that provider and the new Messaging API channel. Under Messaging API, issue a
   **channel access token (long-lived)**. That is `LINE_CHANNEL_ACCESS_TOKEN`.

### 2. LINE Login channel and the LIFF app

1. In the **same provider**, create a **LINE Login** channel. Its Channel ID
   (Basic settings) is `LINE_LOGIN_CHANNEL_ID`.
   The provider matters: LINE gives each person a different user id per
   provider, and the shop can only message the id from its own provider.
2. Basic settings > Linked LINE Official Account: pick the account from step 1.
3. LIFF tab > Add:
   - Size: Full
   - Endpoint URL: `https://<your public host>/line`
   - Scopes: `openid` and `profile`
   - Add friend option: On (aggressive), so customers follow the account and
     can receive messages
4. The LIFF ID shown afterwards (`1650000000-xxxxxxxx`) is `LINE_LIFF_ID`.
5. While the channel is "Developing", only you and the testers you add under
   Roles can sign in. Publish it when real customers should use it.

### 3. A public HTTPS URL

LINE only opens HTTPS pages. For a demo, a tunnel from your machine is enough:

```sh
# Development: api on HTTP_PORT, frontend on 5173
cloudflared tunnel --url http://localhost:5173

# Docker: the whole shop on APP_PORT
cloudflared tunnel --url http://localhost:8080
```

Copy the `https://....trycloudflare.com` address into the LIFF Endpoint URL
(keep the `/line` path). A quick tunnel gets a new address every time it
starts, so update the endpoint after each restart. `ngrok http 5173` works too.
The Vite dev server already allows both hosts.

### 4. Configure and restart

In `.env`:

```sh
LINE_MODE=live
LINE_LOGIN_CHANNEL_ID=1650000000
LINE_LIFF_ID=1650000000-xxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=...
```

Restart the api. The api refuses to start in `live` mode if a value is missing.

### 5. Put the form in front of customers

In LINE Official Account Manager, add a rich menu button or a greeting message
that links to `https://liff.line.me/<LINE_LIFF_ID>`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| The form says sign-in failed | `LINE_LIFF_ID` is wrong, or the LIFF app lacks the `openid` scope |
| Ordering answers 401 | The ID token expired (close and reopen the form), or `LINE_LOGIN_CHANNEL_ID` is not the channel that owns the LIFF app |
| Orders work but no message arrives | The customer has not added the Official Account as a friend, the Login and Messaging channels are under different providers, or the free message quota for the month is used up. The api logs `line message not delivered` with the reason |
| The page will not load through the tunnel | The LIFF endpoint still points at an old tunnel address |
