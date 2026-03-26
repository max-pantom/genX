---
name: terminal-ui-style-replicator
description: Use when asked to make any UI feel like the SKLX terminal style: hard-edged dark surfaces, mono-heavy typography, restrained amber accents, and precise system-like structure without assuming a docs page, status panel, or literal TUI.
---

# Terminal UI Style Replicator

Build interfaces using the visual language of the SKLX CLI docs page.

This skill should not force every screen to become a fake terminal.
The goal is:
- make any UI feel system-like, precise, dark, and operator-oriented
- borrow the terminal structure when it helps
- avoid assuming the UI is a docs page, a status dashboard, or a command console
- avoid stuffing unrelated products with labels like `STATUS ONLINE` if they do not belong there

## Core look

- Use a near-black background: flat, not glossy.
- Keep the whole surface dark, not just inner cards.
- Use hard edges and straight borders. No rounded cards unless the existing product already depends on them.
- Typography should be mostly mono, compact, medium-to-bold weight.
- Accent color is restrained amber and should mostly appear on hover, focus, or active state.
- Default text color should be cool light gray, not bright white.
- Avoid decorative gradients, soft glassmorphism, oversized shadows, and “dashboard” card clutter.

## Main principle

Translate the terminal feeling, not the terminal literal.

That means:
- preserve the hard-edged, operator-console mood
- preserve the typography, spacing, and interaction logic
- adapt the structure to the product you are actually styling

Examples:
- a docs page can use command rails, status strips, and keyboard hints
- a settings page can use hard dividers, mono labels, dense grouped controls
- a profile can use terminal contrast, dense typography, and operator-like spacing without pretending to be a shell
- a normal product screen can use the visual system without any fake terminal chrome
- a marketing page should only borrow the visual system lightly unless the user explicitly wants a full terminal concept

## Layout rules

- Make the screen feel precise, system-like, and deliberate.
- Prefer one primary bounded surface with internal dividers.
- Use panel splits, rails, compact modules, structured lists, and metadata rows when they help.
- Keep structure believable for the actual product.
- If the UI is command-oriented, use:
  - command index
  - active command area
  - status line
  - notes/help text
  - keyboard hints
- If the UI is not command-oriented, translate those ideas into:
  - navigation rail
  - active detail panel
  - compact metadata rows
  - subtle state labels
  - structured supporting notes
- If the UI is neither command-oriented nor panel-heavy, just keep:
  - hard divisions
  - dense typography
  - restrained color
  - believable hierarchy
- Avoid generic hero-copy sections above the interface unless explicitly requested.

## Styling rules

- Borders: thin, visible, low-contrast white/gray lines.
- Radius: zero or extremely small.
- Text:
  - labels: uppercase, tiny, tracked out
  - body: small, dense, readable
  - commands: mono, medium/bold
- Color hierarchy:
  - base background: `#090909` to `#0d0d0d`
  - panels: slightly lifted but still dark
  - text: muted gray
  - emphasis: white
  - accent: amber only for interaction or selection
- Hover states should feel like terminal state changes, not button animations.

## Interaction rules

- Commands should feel selectable, inspectable, and copyable.
- Copy affordances should look like inline terminal text, not glossy buttons.
- Keyboard hints should be visible but quiet.
- Selected rows should look active through contrast and border/background shifts, not loud fills.
- Make the UI feel keyboard-first even if mouse works.

## Theme
- use themes like amber, blue and red only when asked

## Believability rules

When designing a fake or static terminal/TUI:
- Include plausible status labels such as `STATUS ONLINE`, `INPUT READY`, `ROW 03`, `MODE DOCS` only if the product actually benefits from them.
- Use concise system-like wording.
- Avoid fake terminal noise that says nothing.
- Every visible line should imply an actual workflow.

When designing a non-terminal UI in this style:
- do not force shell-like labels just because they look cool
- prefer truthful labels tied to the product
- use system language sparingly
- if a label does not improve comprehension, remove it

Good:
- `Mode: Edit`
- `Draft`
- `Updated now`
- `Profile state`
- `Selection`

Bad:
- `STATUS ONLINE` on a random profile card
- `ROW 03` on a page with no row logic
- meaningless terminal chatter that does not map to the screen
- forcing every screen into a fake docs/status layout

## Responsive behavior

On mobile:
- Stack panels vertically.
- Let the page scroll normally.
- Convert wide command indexes into horizontal rails if needed.
- Allow long commands to wrap.
- Remove nonessential visual noise before shrinking the font too far.

## Avoid

- pastel colors
- large rounded marketing cards
- multiple bright accent colors
- oversized hero sections
- center-everything landing-page aesthetics
- fake cyberpunk clutter
- glows everywhere
- useless terminal gibberish
- forcing fake console labels onto unrelated screens
- using terminal chrome when a simple hard-edged system panel would be cleaner

## Output standard

When asked to implement this style:
1. Make the page mostly dark from edge to edge.
2. Decide whether the product needs a literal terminal structure or just the visual language.
3. Build one primary hard-edged surface first if the layout benefits from it; otherwise just apply the visual system to the existing structure.
4. Use mono-heavy typography and hard dividers.
5. Add only one restrained accent color.
6. Make the screen feel operational and believable for that product.
7. Ensure mobile does not overflow horizontally.

## Quick reference tokens

- dark terminal
- hard borders
- mono-heavy
- compact text
- believable TUI
- amber hover only
- keyboard-first
- command surface
- status strip
- no rounded dashboard cards
- translate the terminal mood, not the terminal literal
