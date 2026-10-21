---
version: 1
slug: "frontend-src-routes-app-tsx"
primary_target: "frontend/src/routes/_app.tsx"
related_targets: ["frontend/src/routes"]
---

# Surface brief: back-office app shell

Scope: every signed-in back-office page (`frontend/src/routes/_app*`). Mode: Operate. The LINE customer form (`/line`) is out of scope.

Audience and job: the shop owner at a desktop all day; staff pack, ship, receive and count. Task first: what waits, what to pick, what runs out.

Pinned by the user (2026-10-21): keep the current palette (navy #2A3563, marker yellow #F3D83A, cool canvas); keep the current minimal white sidebar with small icons, group headings and the yellow current bar; stock reads like a passbook; everything else follows Platform Board.

## Direction contract

THESIS: The day's orders run like a timetable: each order a departure with its time, its channel line and how long it has waited. Refuses the SaaS card-dashboard: no navy band with pill buttons, no hero counts on highlighter strokes, no equal white cards floating on grey.

OWN-WORLD: a white departure board carrying the clock and waiting counts as navy figures marked by yellow bars (navy fills only the top bar and buttons); white working surface ruled into timetable columns with a 2px ink rule under each section head and 1px hairlines between rows; square 3px buttons; channels as 4px coloured line bars; late orders print ล่าช้า in red like a delay notice; stock history printed as passbook rows (date, entry, เข้า, ออก, คงเหลือ) ending in today's balance. One text size (14) does most of the work; rank comes from column, weight and ink. Numbers always full ink. Running figure flush right on every row. Destructive actions stand apart behind empty space. Lists ranked by meaning (stock by how soon it runs out).

STORY: The owner glances at the strip to know what waits, works the queue top to bottom acting in each row, and can explain any stock number by reading its passbook rows.

FIRST VIEWPORT: Today at 1440: current sidebar left (216px). A white board sheet heads the content: title, date and quick actions (ขายหน้าร้าน navy primary) over a 2px ink rule, then clock 20:31 and รอแพ็ก / รอส่ง / ของใกล้หมด as 40px navy figures, each with a 4px yellow leading bar when work waits (the user rejected solid navy blocks on 2026-10-21). Below on the canvas, the order queue as a timetable (เวลาสั่ง, ออเดอร์ with its channel line under the number, ลูกค้าและของที่ต้องหยิบ, สถานะ, รอมาแล้ว flush right, action) takes two thirds; the channel shares the order cell because a separate column left the customer column about 130px at 1440 beside the stock column; ของใกล้หมด ranked by sellable count takes the right third. Sales line sits under the strip.

FORM: Platform Board (station timetables and departure boards), position 4 of 7 on the grounded list, fused with Passbook (position 1) for stock history at the user's request. seed:5dc384ae755ebf88

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
