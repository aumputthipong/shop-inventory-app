# Design system: Stockroom

The back office of a small shop: a navy band carries the app frame and each
page heading, white label panels sit on a cool canvas and overlap the foot of
the band, and highlighter yellow marks the work that is waiting for you. Clean
and square like a place where every unit is counted. People use it all day, so
it stays quiet and lets the numbers speak.

Colour follows 60-30-10: about 60 percent canvas and white panels, 30 percent
navy (the top bar, the page band, actions and the unit strip), 10 percent
yellow (waiting work, the current page, held units). A brighter blue
(`#2456DE`) was tried for the band and read too loud for all-day use.

## Principles

1. **Counted, not decorated.** Counts are the loudest things on any screen,
   set in a condensed face like the quantity printed on a carton. Everything else
   is plain text, hairlines and whitespace. A count of work takes the place an
   icon would have taken; icons help with finding things (the nav, sales
   channels), they never decorate a heading.
2. **Square panels, round buttons.** Panels, inputs and chips keep small
   radii (4-8px); chips look like printed labels, not bubbles. Buttons are
   pills, so anything you can press stands apart from the content.
3. **Flat on the page, lifted only when floating.** Panels sit on the canvas
   with a 1px border. Shadows belong to dialogs, menus and toasts only.
4. **Yellow marks, navy acts.** Highlighter yellow marks work that waits (a
   stroke under a count above zero), the current page and units held by
   orders; it never carries text. Navy is the frame and the one colour that
   means "do something": primary buttons, links, focus, the selected item.
5. **Codes read like labels.** SKUs and order numbers are medium weight with a
   little tracking and tabular figures, so they are easy to read aloud and
   compare down a column.
6. **Structure carries meaning.** Separate facts with space or layout, not
   with dots. A link says where it goes ("ดูทั้งหมด 4 ออเดอร์"), with no arrow.

## Colour

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#EEF0F4` | App background: cool grey, dark enough that white panels read as labels |
| `surface` | `#FFFFFF` | Panels, dialogs, inputs: the label stock |
| `surface-2` | `#F6F8FC` | Hover and subtle fills inside a panel (not band headers) |
| `edge` | `#DDE3EE` | Outer border of a panel |
| `line` | `#E6EAF2` | Hairlines between rows inside a panel |
| `line-strong` | `#C9D1E0` | Input and outline-button borders, a count of zero |
| `ink` | `#172036` | Primary text, numbers, the brand mark outline |
| `ink-2` | `#4A5470` | Secondary text |
| `ink-3` | `#5F6983` | Meta text, placeholders (4.5:1 or more on canvas) |
| `brand-600` | `#2A3563` | Top bar, page band, primary action, links, focus ring, selected item, available units |
| `brand-700` | `#1E2750` | Primary hover |
| `brand-50` | `#EFF1F8` | Selected row background |
| `marker-500` | `#F3D83A` | Highlighter: counts of waiting work, current page underline, brand mark lid, avatars |
| `marker-600` | `#D9BD1C` | Held-units hatch stripe |
| `marker-100` | `#FCF4C6` | Held-units hatch ground |
| `marker-700` | `#6A5800` | Text on marker tints |

Inside the band the `on-brand` utility remaps the tokens: `ink` turns white,
`ink-2` and `ink-3` turn pale, primary buttons turn white with navy text and
outline buttons turn translucent white. Components placed in the band need no
band-specific classes.

Status chips keep their hue family (green done, amber attention, red problem,
blue/indigo in progress, neutral closed) as a light fill with dark text. Status
colour lives in chips, toasts and errors, not in running text, and never colours
whole rows. Two exceptions: a count of zero units turns red, and an order that
has waited too long shows its age in `chip-warn-fg` text, not a chip.

A chip marks an exception, never the normal case: a product that sells fine has
no status chip, only one that is low, sold out or switched off.

## Type

- **IBM Plex Sans Thai** for all UI text: loopless Thai that reads modern and
  businesslike, with Latin from IBM Plex Sans. Codes (`code` utility) use it too.
- **Barlow Condensed** (`count` utility, weight 700) for counts only: how
  many orders wait, how many units can still be sold. Never for words, codes,
  prices or small numbers inside a sentence. A stencil face (Big Shoulders
  Stencil) was tried first; its cut strokes made a 4 hard to read at a glance.
- Numbers use tabular figures everywhere.

| Role | Size / line | Weight |
|---|---|---|
| Page title (`page-title` utility) | 28 / 36 | 700 |
| Section title | 16 / 24 | 600 |
| Body | 14 / 22 | 400 |
| Meta, table header | 13 / 20 | 400-500 |
| Count, hero (available in the product panel) | 64 / 1 | count 700 |
| Count, work lane (Today) | 48 / 1 | count 700 |
| Count, side list (Today) | 34 / 1 | count 700 |
| Count, table column | 30 / 1 | count 700 |

## Shape and depth

| Token | Radius | Use |
|---|---|---|
| `rounded-sm` | 4px | Chips, unit cells |
| `rounded-md` | 6px | Inputs, segmented controls |
| `rounded-lg` | 8px | Panels, cards, list containers |
| `rounded-xl` | 12px | Dialogs |
| `rounded-full` | pill | Buttons, the switch, people's avatars |

- Panels: the `panel` utility (`surface`, 1px `edge` border, `rounded-lg`), no
  shadow.
- Floating layers (dialog, menu, toast): one shadow token, `shadow-float`.
- Focus: 2px navy outline with 2px offset, on every interactive element
  (white inside the band).

## Components

- **Top bar**: `on-brand` navy, flowing straight into the page band with no
  rule between them. Each navigation item has a 16px icon and its label; the
  current page is white and semibold with a 3px yellow underline.
- **Page band**: `PageBand` (used by `PageHeader` and by detail pages) is the
  navy zone behind the back link, title, description and actions. It bleeds
  to the window edges and ends 56px below its content; the first panel after
  it overlaps that foot by 32px. Whatever follows a page header must therefore
  be a panel or an alert, never bare text.
- **Today**: the page title is "งานวันนี้" with the date beside it, quick
  actions on the right. A two-column grid of equal halves: orders in the order
  they move (ต้องแพ็ก then รอส่ง) on the first row, stock (ของใกล้หมด, recent
  movements) on the second. Panels in a row stretch to the same height and keep
  their footer at the bottom. Each section opens with its count where an icon
  would otherwise go: a count above zero sits on a yellow highlighter stroke
  (`highlight` utility), a count of zero turns `line-strong` so empty work
  recedes.
  Exceptions that are usually zero (counts waiting for the owner) get a one-line
  notice above the grid only when they exist, never an empty panel. The owner
  also sees one sales line inside the band, under a pale rule: "ขายวันนี้", the
  total at 22px and the order count on one baseline, then each channel and
  shipped as icon, label and figure on the right. Zero
  figures recede to `ink-3`; a day with nothing sold or shipped collapses to
  the total and "ยังไม่มีออเดอร์วันนี้". Money stays in Plex, never the count
  face, and drops `.00` when the amount is whole.
- **Buttons**: 36px (40px for a dialog's main action), pill shaped. Primary
  is flat navy; secondary is white with `line-strong` border; ghost for
  low-emphasis actions in rows.
- **Filter tabs**: an underlined tab row (2px navy), count in muted text after
  the label.
- **Lists and tables**: rows separated by `line` hairlines; the header row and
  other bands inside a panel (tab bar, dialog footer) are split off by a rule,
  not a tinted fill. Selected row: `brand-50` background and a 2px navy bar
  on the leading edge. No rounded hover blocks. A cell that holds two facts
  stacks them (main fact on top, the other in 12px `ink-2` below) instead of
  setting them side by side. Where a right-aligned number column meets a
  left-aligned text column, the text column gets 20px of extra left padding so
  the two never read as one phrase.
- **Chips**: 22px tall, radius 4, 12px medium text, light fill.
- **Channel**: `ChannelChip` is the channel's icon in its own colour (store
  navy, Shopee orange, LINE green) followed by the name in `ink-2`; no box. In
  a row it gets a fixed width so the icons line up down the list.
- **Stock bar** (product list): `StockBar`, one fixed-length bar per row,
  10px tall. The full length is what is on hand: navy for what can still be
  sold, yellow hatch for what orders hold, an empty `line` track when nothing
  is on hand. A caption below says it in words ("จองไว้ 6 จาก 22"). Every row
  has the same length so the list keeps one rhythm; the count column carries
  the absolute number.
- **Unit strip** (product panel, stock change preview): one square-ish cell per
  unit (radius 2): navy = available, yellow hatch = held by orders. Above 40
  units it becomes a proportional bar.
- **Products** are shown by name with the SKU below, never with a letter
  tile or placeholder image.
- **Empty states**: the open box (ink outline, yellow lid) with a navy
  magnifier, one sentence of help and at most one action.
- **Page header**: `PageHeader` (title, optional `aside` beside it, one line
  of description, actions on the right, optional back link). No eyebrow line
  above the title. Detail pages that need chips beside the
  title use `BackLink` and their own title row.
- **Form fields**: `Field` from `components/ui/field.tsx`: 13px label above the
  control, a muted hint or a red error below.
- **Errors**: `ErrorAlert`: `chip-bad` fill, radius 6, alert icon, 13px text.
  One style everywhere, in dialogs and on pages.
- **Search**: `SearchInput`, the input with a magnifier inside on the left.

## Voice

Plain Thai, short, from the shop's point of view: "ขายได้อีก 3 ชิ้น", not
"Available quantity: 3". Errors say what happened and what to do next. Toasts
confirm with the same verb as the button that caused them.

## Don't

- Don't use `rounded-full` except for buttons, the switch and people's avatars.
- Don't put shadows under panels that sit on the page.
- Don't use yellow for actions or set text in it. A highlighter stroke means
  "waiting for you"; don't put one under anything else.
- Don't use a gradient on the band; it is flat navy.
- Don't colour whole rows by status; use a chip.
- Don't introduce new font sizes outside the table above.
- Don't put an icon in a tinted square beside a heading; lead with the count
  or with nothing.
- Don't put a status chip on every row or a letter tile beside every name.
- Don't box a few figures into a card of equal stat cells.
- Don't join facts with `·` or end a link with `→`. An arrow is fine where it
  means "changes to" (`12 → 15 ชิ้น`).
- Don't use the count face for anything but a count.
