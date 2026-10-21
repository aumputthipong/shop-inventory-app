---
name: Platform Board
description: Back office for a small multi-channel shop. Orders run like a timetable; stock reads like a passbook.
colors:
  navy: "#2A3563"
  navy-deep: "#1E2750"
  navy-50: "#EFF1F8"
  navy-100: "#E2E6F2"
  navy-200: "#C8CFE6"
  marker-yellow: "#F3D83A"
  marker-300: "#F8E98E"
  marker-100: "#FCF4C6"
  marker-600: "#D9BD1C"
  marker-700: "#6A5800"
  canvas: "#EEF0F4"
  surface: "#FFFFFF"
  surface-2: "#F6F8FC"
  edge: "#DDE3EE"
  line: "#E6EAF2"
  line-strong: "#C9D1E0"
  ink: "#172036"
  ink-2: "#4A5470"
  ink-3: "#5F6983"
  late: "#B42318"
  destructive: "#A8261D"
  channel-store: "#2A3563"
  channel-shopee: "#EE4D2D"
  channel-line: "#06C755"
  chip-ok: "#E5F2E8"
  chip-ok-fg: "#1E6B3E"
  chip-warn: "#FBEFD6"
  chip-warn-fg: "#7F4D00"
  chip-bad: "#FBE8E4"
  chip-bad-fg: "#A8261D"
  chip-info: "#E6EDFA"
  chip-info-fg: "#274B99"
  chip-neutral: "#EAEEF5"
  chip-neutral-fg: "#4A5470"
typography:
  board-figure:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  page-title:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
  figure:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  meta:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  code:
    fontFamily: "Bai Jamjuree, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  hairline: "2px"
  button: "3px"
  panel: "4px"
  dialog: "6px"
  pill: "9999px"
spacing:
  row-x: "20px"
  list-x: "16px"
  section-gap: "24px"
  board-x: "24px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    height: "36px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.navy-deep}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    height: "36px"
    padding: "0 14px"
  button-outline-hover:
    backgroundColor: "{colors.surface-2}"
  board:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px 24px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  chip:
    typography: "{typography.label}"
    rounded: "{rounded.panel}"
    height: "22px"
    padding: "0 8px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    height: "36px"
    padding: "0 12px"
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.dialog}"
    padding: "24px"
    width: "480px"
  nav-item-current:
    backgroundColor: "{colors.navy-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    height: "36px"
---

# Design System: Platform Board

## Overview

**Creative North Star: "Platform Board"**

The day's orders run like a timetable; stock reads like a passbook. Today opens on a
departure board: the clock and what waits, each waiting figure marked by a
yellow bar. Below it the working surface is white paper ruled into columns: a 2px
ink rule under each sheet's head, 1px hairlines between rows, every running
figure flush right. Each order is a departure with its time, its channel line
and how long it has waited; a late one prints ล่าช้า in red like a delay
notice. Stock history prints as passbook rows that end in today's balance, so
any number can be explained by reading down.

One text size (14px) does most of the work. Rank comes from column, weight and
ink, not from bigger type or colour fills. Lists are ranked by meaning: the
queue by how long an order has waited, stock by how soon it runs out.

History: Platform Board replaced "Stockroom" on 2026-10-21. The owner found
Stockroom's thick navy page band, pill buttons, highlighter-underlined
condensed counts and equal white cards read as AI-generated.

Pinned by the user, keep these in any future change: the palette (navy,
marker yellow, cool canvas) and the minimal white sidebar with small icons,
group headings and the yellow current bar.

**Key Characteristics:**
- Navy is the top bar and actions only; no solid navy block in the page. Page titles sit on the canvas over a 2px ink rule (Today's sits in its white board).
- White sheets ruled like a timetable: 2px ink rule under the head, 1px hairlines between rows.
- Square 3px buttons; 4px sheets and chips; 6px dialogs and inputs.
- Bai Jamjuree everywhere, tabular figures everywhere, counts in the `figure` weight.
- Channels as 4px coloured line bars, status as weighted text, chips only for exceptions.
- Passbook rows for stock history: วันที่ / รายการ / เข้า / ออก / คงเหลือ.

## Colors

A cool office palette: canvas and white paper carry most of the screen, navy
frames and acts, yellow marks what waits, red marks what is late or gone.

### Primary
- **Station Navy** (navy): the top bar, primary buttons, the board's waiting figures, links, focus ring, the selected nav icon, the store channel bar. Navy Deep (navy-deep) is primary hover. Navy 50 (navy-50) fills the selected row and the current nav item; Navy 100 is the input focus halo.

### Secondary
- **Marker Yellow** (marker-yellow): waiting work and "you are here". The board's clock and waiting figures, the current nav item's 3px bar, the brand mark lid, the account avatar. Marker 300 is its hover and the text selection colour; Marker 100 and Marker 600 make the held-units hatch in the stock-change preview; Marker 700 is text on marker tints.

### Tertiary
- **Delay Red** (late): ล่าช้า, the wait of a late order, a sellable count of zero, the ออก column in a passbook, and inline row errors. It is text colour only, never a fill.
- **Channel lines** (channel-store, channel-shopee, channel-line): the 4px bar before a channel name. Store is navy, Shopee its orange, LINE its green. Used nowhere else.

### Neutral
- **Cool Canvas** (canvas): app background.
- **Paper** (surface): sheets, dialogs, inputs, the sidebar. Surface 2 is hover and quiet fills inside a sheet.
- **Edge** (edge): a sheet's outer 1px border and the sidebar's right border.
- **Hairline** (line): 1px rules between rows and above footers.
- **Strong Line** (line-strong): input and outline-button borders, the unfinished part of the order timeline.
- **Ink** (ink): text, numbers and the 2px sheet rule. Ink 2 is secondary text and column labels; Ink 3 is meta, placeholders and figures that are zero.
- **Chip tints** (chip-ok, chip-warn, chip-bad, chip-info, chip-neutral with their -fg pairs): exception chips and the error alert. Light fill, dark text.

### Named Rules
**The Numbers In Ink Rule.** Counts, money and balances are full ink. A figure only changes colour for a reason: navy with a yellow bar on the board when work waits, Ink 3 when it is zero, red when it is late or sold out.

**The Yellow Waits Rule.** Yellow means "waiting for you" or "you are here". It never carries body text on white and never marks an action.

**The On-Brand Remap Rule.** Inside navy (the top bar) the `on-brand` utility turns ink white and ink 2/3 pale and makes outline buttons translucent. Components placed on navy need no navy-specific classes.

## Typography

**Body Font:** Bai Jamjuree 400/500/600/700 (with system-ui), for every word, number and code.

**Character:** A squared, technical Thai and Latin face that reads like a printed timetable. Tabular figures are set on `html`, so every column of numbers lines up.

### Hierarchy
- **Board figure** (600, 40px, line 1, `figure`): the board's clock and waiting figures, and ขายได้อีก in the product panel.
- **Page title** (700, 24/32, `page-title`): one per page, on the canvas.
- **Panel figure** (600, 24px, `figure`): มีในคลัง and จองไว้ in the product panel, the pending-count notice on Today.
- **List figure** (600, 20px, `figure`): ขายได้ in the stock list, ขายได้อีก on Today's ของใกล้หมด. Money totals use 20px semibold without `figure`. The passbook's closing balance is 18px `figure`.
- **Title** (600, 16/24): dialog titles, the product name in the panel, empty-state titles.
- **Body** (400, 14px, line 1.6): almost everything. Sheet heads are 14px bold; names in rows 14px medium.
- **Meta** (400, 13px): second lines in a cell, sheet meta, links in sheet heads, field labels (500).
- **Label** (500, 12px): column labels and chips; field hints and errors are 12px regular.
- **Code** (500, 14px, tracking 0.02em, `code`): SKUs and order numbers.

### Named Rules
**The One Size Does The Work Rule.** 14px carries most text. Rank a row's facts by column, weight (400 / 500 / 600 / 700) and ink (ink / ink 2 / ink 3), not by new sizes. The steps above are the whole scale.

**The One Face Rule.** Counts use Bai Jamjuree with the `figure` utility (600, line 1). No condensed, stencil or display face for numbers.

## Layout

- **Shell**: a 56px navy top bar, full width, with the brand in a slot as wide as the sidebar and the account menu right. Below it a 208px white sidebar (`lg` and up), sticky and scrolling on its own, and `main` as a container (`@container`), left-aligned, at most 1400px, padded 16 / 24 / 40px by breakpoint.
- **Container queries**: layouts split on the container, not the window. `@5xl` puts Today's queue beside a 340px ของใกล้หมด column and the stock list beside its product panel; `@4xl` splits the order detail into items and a 400px side column; `@2xl` turns queue rows into timetable columns.
- **Rhythm**: 24px between sections of a page; 20px row padding inside sheets (16px in full-page lists); rows at least 48-56px tall.
- **Columns**: text left, numbers right, the running figure in the last numeric column. Where a cell holds two facts, the main fact sits on top and the other in 13px Ink 2 below.
- **Wide tables** (orders 920px, ledger 1160px) scroll sideways inside their sheet rather than squeezing columns.

## Elevation & Depth

Flat. Sheets sit on the canvas with a 1px edge border and no shadow; structure comes from rules, not lift. One shadow token exists for things that float over the page: dialogs, the account menu, the nav drawer and the toast.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 12px 32px rgb(23 32 54 / 0.14), 0 2px 6px rgb(23 32 54 / 0.06)`): floating layers only.

### Named Rules
**The Rules Not Lift Rule.** Separate with a 2px ink rule, a 1px hairline or space. A shadow under a sheet on the page is wrong.

## Shapes

Square and printed. Buttons are 3px, sheets, the board, chips, toasts and menus 4px, dialogs, inputs, nav items and the error alert 6px. Timeline nodes and unit cells are 2px. Full rounding is kept for the switch, people's avatars and the ends of the current-item bar.

The signature line is the **sheet rule**: `sheet-head`, a 2px ink border under a sheet's head. A sheet carries one: under its title, or under its column labels when the sheet opens with filter tabs instead of a title. Rows below are split by 1px hairlines; a passbook's closing row sits on a 2px ink rule of its own.

## Components

### Buttons
Square and plain, so they read as controls without shouting.
- **Shape:** 3px corners. 36px default, 32px small (13px text), 40px large (dialog and page primary). Icons 16px before the verb.
- **Primary:** flat navy, white text, Navy Deep on hover.
- **Outline:** white with a Strong Line border, Surface 2 on hover. On navy it turns translucent white.
- **Ghost:** Ink 2 text, Surface 2 on hover, for icon actions in rows and panel heads.
- **Destructive:** filled red, only inside a confirm dialog.
- **Focus:** a 2px navy outline with 2px offset (white on navy). Pressed buttons drop 1px.

### Today board
A white sheet that heads Today. Top row: the page title งานวันนี้ with the long date, and the quick actions on the right (ขายหน้าร้าน navy primary, the rest outline), over the 2px ink rule. Below: the clock as a 40px ink figure, then รอแพ็ก, รอส่ง and ของใกล้หมด as 40px figures with 13px labels. Each figure has a 4px bar on its leading side, the same mark as a channel bar: Marker Yellow when work waits, with the figure in navy; Line grey and an Ink 3 figure at zero. Each figure links to its filtered list (`/orders?status=…`, `/stock`). On a day with no work, one 13px line under the clock says so. Two navy versions were tried and dropped: a solid navy board with the title and buttons inside (too heavy), and a slim navy strip under a canvas title row; the owner wanted this layout without the block of navy.

The owner's sales line sits under the board on the canvas: ขายวันนี้, the total in 20px semibold, the order count, then each channel as its line bar, name and amount; zero amounts drop to regular weight in Ink 3. Money drops `.00` when whole. A count of results waiting for approval gets a one-line notice only when it exists.

### Timetable sheets
A white `panel` sheet: a head row with a 14px bold title and 13px meta on the right, the 2px ink rule, 12px column labels, then rows split by 1px hairlines. A footer, split by a hairline, holds "ดูทั้งหมด" links only when the sheet holds more than it shows.

### Order queue
Columns: เวลาสั่ง, ออเดอร์, ลูกค้าและของที่ต้องหยิบ, สถานะ, รอมาแล้ว (flush right), then the action button. Oldest first. The channel line bar and name sit under the order number in the same cell: a separate channel column left the customer column about 130px wide at 1440. The time is today's clock or a date for older orders. After 24 hours the status reads ล่าช้า and the wait turns Delay Red, both semibold. Each row has its next step (แพ็กแล้ว or ส่งแล้ว) as a small outline button. Below `@2xl` the row stacks: time and order on top, customer and picks, status and wait, button on the right.

The orders page uses the same language: เวลาสั่ง, เลขออเดอร์ (with the channel's own reference below), ช่องทาง, ลูกค้าและของที่สั่ง, สถานะ, จำนวน, ยอดรวม.

### Status text
`OrderStatusText` prints status as weighted text, not a chip: รอแพ็ก semibold ink, แพ็กแล้ว medium ink, ส่งแล้ว Ink 2, ยกเลิก Ink 3 struck through, ล่าช้า semibold Delay Red.

### Channel mark
`ChannelMark` is a 4×16px bar with 1px corners in the channel colour; `ChannelChip` is the bar and the channel name. No box, no icon.

### Passbook
Stock history for one product (the product panel) prints as passbook rows: วันที่ / รายการ / เข้า / ออก / คงเหลือ. รายการ is the movement word over its reference (order number, delivery note, reason). เข้า and ออก are left blank when nothing moved that way; ออก prints in Delay Red; คงเหลือ is semibold. The block opens with ยอดยกมา (the balance carried in) and closes with คงเหลือวันนี้ in bold over a 2px ink rule, the balance in an 18px `figure`. Reversed rows are struck through in Ink 3.

The ledger page keeps the passbook order on the right of each row: เวลา, สินค้า, รายการ, อ้างอิง, โดย, the undo action, เข้า, ออก, คงเหลือ.

### Stock list
Columns: สินค้า (name over SKU), มีในคลัง, จองไว้, ขายได้. ขายได้ is a 20px `figure`, red at zero; จองไว้ of zero is Ink 3. Inactive products sink to the bottom; the rest are ranked by how soon they run out (sellable divided by the alert point), then by name. The selected row gets the Navy 50 fill and a bold name, no side stripe. A low, sold-out or switched-off product carries its chip after the SKU; a product that sells fine carries none.

### Product panel
Head: name (16px semibold), SKU and price, the เปิดขาย switch, an edit ghost button. Then มีในคลัง and จองไว้ as 24px figures and ขายได้อีก as a 40px figure split off by a hairline, with the alert line below. Then actions, the passbook, and the holds: each order that holds the product as order number, channel mark, status text and quantity.

### Order detail
A title row on the canvas: back link, the order number in `code` page-title, channel mark and status text, the one primary action on the right. Items fill a sheet with the total under a hairline. One ruled side column (400px) holds ส่งถึง, ความคืบหน้า (a square-node timeline, ink when done, Strong Line when not) and who created it. Cancel lives at the foot of that column, an outline button behind 40px of space and a hairline, far from the primary, and opens a confirm dialog with the destructive button.

### Page header
`PageHeader` puts the title (with an optional `aside` beside it) and the actions on one row over a 2px ink rule (`TitleRow`), directly on the canvas. No band, no eyebrow, no subtitle that restates the title. A `description` only for a live status or a rule the page cannot show. A back link only on detail pages.

### Filter tabs
`FilterTabs` for every filter (status, channel, movement type, stock state): text tabs 44px tall, 20px apart, the active one medium ink over a 2px navy underline, a count in muted text after the label. They sit in the sheet's top bar beside the search.

### Chips
- **Style:** 22px tall, 4px corners, 12px medium text, a light chip tint with its dark text.
- **Use:** exceptions only: ใกล้หมด, หมดแล้ว, ปิดขาย, ยกเลิกแล้ว, สั่งเองผ่าน LINE.

### Inputs and fields
- **Style:** 36px, 6px corners, Strong Line border, white, 14px text, Ink 3 placeholder.
- **Focus:** navy border with a 2px Navy 100 halo.
- **Field:** `Field` puts a 13px medium Ink 2 label above the control and a 12px hint (Ink 3) or error (red) below.
- **Search:** `SearchInput`, a 16px magnifier inside the left of the input; 32px tall in a sheet's top bar.
- **Form choices:** `Segmented` for picking one of two or three values inside a form (handover, channel, how to adjust): a Surface 2 track, 6px corners, the chosen option white. Not for filters.

### Errors, toasts and empty states
- **ErrorAlert:** chip-bad fill, 6px corners, alert icon, 13px text. One style in dialogs and on pages. A failure inside a queue row is one 13px red line in the row.
- **Toast:** ink, 4px corners, Float shadow, a green check, bottom centre; it uses the same verb as the button that caused it.
- **EmptyState:** the open box drawing (ink outline, yellow lid, navy magnifier), a 16px semibold title, one 13px sentence, at most one action.

### Navigation
- **Sidebar** (pinned): white, 208px, an edge right border. Groups split by a hairline, each opening with its 13px semibold ink label. Items are 36px rows with 6px corners: an 18px icon in Ink 3 and the label in 14px Ink 2. The current item is ink semibold on Navy 50, a navy icon and a 3px yellow bar on its leading edge.
- **Drawer** (below `lg`): the same list in a 280px sheet from the left over a dimmed page; it closes on a link, its close button and Escape.

| Group | Items |
|---|---|
| (none) | วันนี้ |
| งานขาย | ออเดอร์, ขายหน้าร้าน, คีย์ออเดอร์ออนไลน์ |
| คลังสินค้า | สต็อก, รับของเข้า, ตรวจนับ, ประวัติสต็อก |
| จัดการร้าน (owner only) | ทีม, บันทึกการใช้งาน |

`src/lib/nav.ts` holds the list. The account page stays in the account menu. A new page joins the group whose work it serves. The current item is the longest path that matches whole segments, so `/orders/new` is ขายหน้าร้าน and `/orders/12` is ออเดอร์. A page keeps the same icon everywhere.

- **Text links:** navy with a Strong Line underline that turns navy on hover. A link says where it goes, with no arrow.

### Voice
Plain Thai, short, from the shop's point of view: "ขายได้อีก 3 ชิ้น", not "Available quantity: 3". Errors say what happened and what to do next. Toasts confirm with the same verb as the button. If a word needs a help note, change the word instead. Separate facts with space or columns, not with `·`.

One word per idea, everywhere (labels, column heads, buttons, toasts, aria labels):

| Idea | Word | Not |
|---|---|---|
| Units an order holds | จองไว้ | รอดำเนินการ, กันไว้ |
| Units that can still be sold | ขายได้ | พร้อมขาย, ว่าง |
| Units on the shelf | มีในคลัง | สต็อกจริง |
| Order not packed yet | รอแพ็ก | รอดำเนินการ |
| Bringing stock in | รับของเข้า | รับของจากใบส่งของ |
| Counting the shelf | ตรวจนับ | นับสต็อก |
| Keying in a marketplace or chat order | คีย์ออเดอร์ออนไลน์ | ออเดอร์จาก Shopee หรือ LINE |

## Do's and Don'ts

### Do:
- **Do** put a 2px ink rule (`sheet-head`) under each sheet's head or column labels, and 1px hairlines between rows.
- **Do** set every count in Bai Jamjuree with `figure`, flush right in its column, in full ink unless it is waiting (yellow on navy), zero (Ink 3) or late or sold out (red).
- **Do** rank lists by meaning: the queue by wait, stock by how soon it runs out.
- **Do** print stock history as passbook rows with blank cells where nothing moved, an opening ยอดยกมา and a ruled คงเหลือวันนี้.
- **Do** keep destructive actions away from the primary, behind space and a rule, and confirm them in a dialog.
- **Do** keep the pinned palette and the pinned sidebar.

### Don't:
- **Don't** put a navy band or a solid navy block in the page. Navy fills only the top bar and buttons.
- **Don't** use pill buttons; buttons are 3px.
- **Don't** put a highlighter stroke under a number.
- **Don't** box figures into equal stat cards; they sit on the board behind their bars, or in their column.
- **Don't** put a coloured stripe on the leading edge of a row; a selected row is a fill and a bold name.
- **Don't** colour-code types with a rainbow of chips; status is weighted text, a chip marks an exception.
- **Don't** use segmented pills for filters; filters are underline tabs.
- **Don't** set a count in any face or weight but Bai Jamjuree `figure`.
- **Don't** print holds as figures in a passbook; holds live in จองไว้ and in the holds list.
- **Don't** add shadows to sheets on the page, or new font sizes outside the hierarchy.
