# Design system: Stockroom

The back office of a small shop, drawn from the stockroom itself: kraft
cartons on steel shelves, printed shipping labels, a clipboard stock card.
The canvas is a soft warm paper and every panel is a white label laid on it;
kraft itself stays in the brand mark, product tiles and held units. Warm and
familiar like a shop you know, but square and orderly
like a place where every unit is counted. People use it all day, so it stays
quiet and lets the numbers speak.

## Principles

1. **Counted, not decorated.** Counts are the loudest things on any screen,
   set in a condensed face like the quantity printed on a carton. Everything else
   is plain text, hairlines and whitespace. A count takes the place an icon
   would have taken.
2. **Square like a shelf.** Small radii (4-8px). Pills are reserved for the
   switch control; chips look like printed labels, not bubbles.
3. **Flat on the page, lifted only when floating.** Panels sit on the canvas
   with a 1px border. Shadows belong to dialogs, menus and toasts only.
4. **Kraft is the brand, petrol is the action.** Kraft brown (the carton) marks
   identity and units held by orders. Petrol is the one colour that means
   "do something": primary buttons, focus, the selected item.
5. **Codes read like labels.** SKUs and order numbers are medium weight with a
   little tracking and tabular figures, so they are easy to read aloud and
   compare down a column.
6. **Structure carries meaning.** Separate facts with space or layout, not
   with dots. A link says where it goes ("ดูทั้งหมด 4 ออเดอร์"), with no arrow.

## Colour

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F5F3EF` | App background: soft warm paper. A full kraft canvas (`#ECE3D2`) was tried and read too heavy for all-day use |
| `surface` | `#FFFFFF` | Panels, dialogs, inputs: the label stock |
| `surface-2` | `#FAF8F5` | Hover and subtle fills inside a panel (not band headers) |
| `edge` | `#E2DCD2` | Outer border of a panel or the top bar against the canvas |
| `line` | `#E7E2DA` | Hairlines between rows inside a panel |
| `line-strong` | `#D5CEC3` | Input and outline-button borders, a count of zero |
| `ink` | `#26221E` | Primary text, numbers |
| `ink-2` | `#5F584F` | Secondary text |
| `ink-3` | `#7A7267` | Meta text, placeholders |
| `petrol-600` | `#0E5E6F` | Primary action, focus ring, selected item |
| `petrol-700` | `#0B4D5B` | Primary hover |
| `petrol-50` | `#EEF5F6` | Selected row background |
| `kraft-500` | `#C98A2E` | Brand mark, held-units hatch |
| `kraft-100` | `#F7E6C4` | Held-units hatch ground, brand tint |
| `kraft-700` | `#7A4B00` | Text on kraft tints |

Status chips keep their hue family (green done, amber attention, red problem,
blue/indigo in progress, neutral closed) as a light fill with dark text. Status
colour lives in chips, toasts and errors, not in running text, and never colours
whole rows. The one exception is a count of zero units, which turns red.

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
| Page title (`page-title` utility) | 28 / 36 | 600 |
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
| `rounded-sm` | 4px | Chips, unit cells, avatars of products |
| `rounded-md` | 6px | Buttons, inputs, segmented controls |
| `rounded-lg` | 8px | Panels, cards, list containers |
| `rounded-xl` | 12px | Dialogs |

- Panels: the `panel` utility (`surface`, 1px `edge` border, `rounded-lg`), no
  shadow.
- Floating layers (dialog, menu, toast): one shadow token, `shadow-float`.
- Focus: 2px petrol outline with 2px offset, on every interactive element.

## Components

- **Top bar**: white with an `edge` bottom border. Navigation items are text
  only; the current page has a 2px petrol underline, not a filled pill.
- **Today**: the page title is "งานวันนี้" with the date beside it, quick
  actions on the right. A two-column grid of equal halves: orders in the order
  they move (ต้องแพ็ก then รอส่ง) on the first row, stock (ของใกล้หมด, recent
  movements) on the second. Panels in a row stretch to the same height and keep
  their footer at the bottom. Each section opens with its count where an icon
  would otherwise go; a count of zero turns `line-strong` so empty work recedes.
  Exceptions that are usually zero (counts waiting for the owner) get a one-line
  notice above the grid only when they exist, never an empty panel. The owner
  also sees one sales strip under the header: today's total at 22px, then a
  cell per channel and one for shipped, split by rules. Money stays in Plex,
  never the count face.
- **Buttons**: 36px (40px for a dialog's main action), radius 6. Primary is
  flat petrol; secondary is white with `line-strong` border; ghost for
  low-emphasis actions in rows.
- **Filter tabs**: an underlined tab row, count in muted text after the label.
- **Lists and tables**: rows separated by `line` hairlines; the header row and
  other bands inside a panel (tab bar, dialog footer) are split off by a rule,
  not a tinted fill. Selected row: `petrol-50` background and a 2px petrol bar
  on the leading edge. No rounded hover blocks. A cell that holds two facts
  stacks them (main fact on top, the other in 12px `ink-2` below) instead of
  setting them side by side. Where a right-aligned number column meets a
  left-aligned text column, the text column gets 20px of extra left padding so
  the two never read as one phrase.
- **Chips**: 22px tall, radius 4, 12px medium text, light fill.
- **Unit strip**: one square-ish cell per unit (radius 2): petrol = available,
  kraft hatch = held by orders. Above 24 (list) or 40 (panel) units it becomes
  a proportional bar.
- **Product tile**: the product's first letter in `kraft-700` on `kraft-50`
  with a `kraft-300` border, radius 4. One tone for every product, like a
  marked carton.
- **Empty states**: the open kraft box with a petrol magnifier, one sentence
  of help and at most one action.
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

- Don't use `rounded-full` except for the switch and people's avatars.
- Don't put shadows under panels that sit on the page.
- Don't use petrol for decoration or kraft for actions.
- Don't colour whole rows by status; use a chip.
- Don't introduce new font sizes outside the table above.
- Don't put an icon in a tinted square beside a heading; lead with the count
  or with nothing.
- Don't join facts with `·` or end a link with `→`. An arrow is fine where it
  means "changes to" (`12 → 15 ชิ้น`).
- Don't use the count face for anything but a count.
