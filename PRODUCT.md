# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the **owner of a small Thai shop, at a desktop computer
all day**, watching orders come in from three channels and keeping stock
right. Staff use the same app less often: packing, shipping, receiving
deliveries and counting shelves. A third audience is people evaluating the
repository (the public demo and README are shown in job interviews), but the
working screen serves the owner first.

LINE customers order through a separate phone form (`/line`, LIFF).

## Product Purpose

One pool of stock is sold through the store counter, Shopee and LINE OA. The
app makes sure two customers can never buy the same last unit: every order
reserves stock first, then ships or is canceled. Success is a day where every
order is packed and shipped, nothing is oversold, and the shelf matches the
ledger.

## Positioning

Stock is never a single number: it is what is on the shelf, what orders hold,
and what can still be sold (`available = on_hand - reserved`), and the
database refuses any balance below zero. Every change is explained by a ledger
row, so the owner can always see why a number is what it is.

## Operating Context

- Daily rhythm: orders arrive, get packed, then shipped; deliveries are
  received; shelves are counted and the owner approves the difference.
- Channels: store counter (sold in person), Shopee (keyed in by hand), LINE
  (customers order themselves; status messages go back to them).
- Roles: owner can do everything; staff can receive, count, create orders and
  pack, ship or cancel, but cannot adjust stock, approve counts, undo
  movements, edit products, manage users or read the audit log.

## Capabilities and Constraints

- Built: sign-in, products with opening stock, stock in (one or a whole
  delivery), adjust, undo a mistyped entry, stock counts with approval, a
  today page, the movement ledger, orders with all-or-nothing reservation and
  the pack/ship/cancel flow, the audit log, LINE customer ordering.
- UI language is Thai. Fixed terminology (one word per idea): จองไว้, ขายได้,
  มีในคลัง, รอแพ็ก, รับของเข้า, ตรวจนับ, คีย์ออเดอร์ออนไลน์.
- Stack: React 19, TanStack Router and Query, Tailwind CSS 4, shadcn/ui
  primitives (vendored), Vitest. Light mode only until asked.

## Brand Commitments

- Voice: plain Thai, short, from the shop's point of view ("ขายได้อีก 3 ชิ้น").
  Errors say what happened and what to do next.
- The visual identity is open: on 2026-10-21 the owner asked to replace the
  previous "Stockroom" look (navy band, yellow highlighter, pill buttons,
  white cards on grey, icon sidebar) because it read as generic AI output.

## Evidence on Hand

- Seeded sample shop (`make seed`) and the public demo at
  turtle-shop.onrender.com. No real customer data, testimonials or metrics;
  do not invent any.

## Product Principles

1. The work decides the layout: what is waiting gets the room.
2. Every number can be explained: shelf, held and sellable are always shown
   apart, and the ledger is one step away.
3. Act where you look: a row that needs something carries its action.
4. Calm for all-day use: nothing competes with the counts and the queue.
