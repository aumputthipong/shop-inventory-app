# Design system: Stockroom

The back office of a small shop, drawn from the stockroom itself: kraft
cartons on steel shelves, printed shipping labels, a clipboard stock card.
Warm and familiar like a shop you know, but square and orderly like a place
where every unit is counted. People use it all day, so it stays quiet and
lets the numbers speak.

## Principles

1. **Counted, not decorated.** The available number and the unit strip are the
   loudest things on any screen. Everything else is plain text, hairlines and
   whitespace.
2. **Square like a shelf.** Small radii (4-8px). Pills are reserved for the
   switch control; chips look like printed labels, not bubbles.
3. **Flat on the page, lifted only when floating.** Panels sit on the canvas
   with a 1px border. Shadows belong to dialogs, menus and toasts only.
4. **Kraft is the brand, petrol is the action.** Kraft brown (the carton) marks
   identity and units held by orders. Petrol is the one colour that means
   "do something": primary buttons, focus, the selected item.
5. **Codes read like labels.** SKUs and order numbers use the mono face, the
   way they are printed on a shipping label, so they are easy to read aloud
   and compare.

## Colour

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F5F3EF` | App background |
| `surface` | `#FFFFFF` | Panels, dialogs, inputs |
| `surface-2` | `#FAF8F5` | Table header, subtle fills inside a panel |
| `line` | `#E7E2DA` | Hairlines between rows and around panels |
| `line-strong` | `#D5CEC3` | Input and outline-button borders |
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
blue/indigo in progress, neutral closed) as a light fill with dark text. They
never colour whole rows.

## Type

- **IBM Plex Sans Thai** for all UI text: loopless Thai that reads modern and
  businesslike, with Latin from IBM Plex Sans.
- **IBM Plex Mono** for SKUs, order numbers and channel references only.
- Numbers use tabular figures everywhere.

| Role | Size / line | Weight |
|---|---|---|
| Page title | 22 / 30 | 600 |
| Section title | 16 / 24 | 600 |
| Body | 14 / 22 | 400 |
| Meta, table header | 13 / 20 | 400-500 |
| Hero number (available) | 48 / 52 | 600 |

## Shape and depth

| Token | Radius | Use |
|---|---|---|
| `rounded-sm` | 4px | Chips, unit cells, avatars of products |
| `rounded-md` | 6px | Buttons, inputs, segmented controls |
| `rounded-lg` | 8px | Panels, cards, list containers |
| `rounded-xl` | 12px | Dialogs |

- Panels: `bg-surface border border-line rounded-lg`, no shadow.
- Floating layers (dialog, menu, toast): one shadow token, `shadow-float`.
- Focus: 2px petrol outline with 2px offset, on every interactive element.

## Components

- **Top bar**: white, hairline bottom border. Navigation items are text with
  an icon; the current page has a 2px petrol underline, not a filled pill.
- **Buttons**: 36px (40px for a dialog's main action), radius 6. Primary is
  flat petrol; secondary is white with `line-strong` border; ghost for
  low-emphasis actions in rows.
- **Filter tabs**: an underlined tab row, count in muted text after the label.
- **Lists and tables**: rows separated by `line` hairlines, header on
  `surface-2`. Selected row: `petrol-50` background and a 2px petrol bar on the
  leading edge. No rounded hover blocks.
- **Chips**: 22px tall, radius 4, 12px medium text, light fill.
- **Unit strip**: one square-ish cell per unit (radius 2): petrol = available,
  kraft hatch = held by orders. Above 24 (list) or 40 (panel) units it becomes
  a proportional bar.
- **Product tile**: the product's first letter on a warm tint, radius 6.
- **Empty states**: the open kraft box with a petrol magnifier, one sentence
  of help and at most one action.

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
