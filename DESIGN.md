# Playloom Design Notes

Playloom is a mathematical diagram editor, so the interface should feel like a precise local tool rather than a content site.

## Principles

- Keep the canvas visually dominant.
- Use restrained neutral surfaces with one blue accent for active states.
- Prefer dense, legible controls over large decorative layouts.
- Make every editing state visible: selected, pending, copied, dragging, disabled.
- Use motion only to confirm state changes, not as decoration.
- Keep exported TikZ and Playscript easy to scan in monospace blocks.

## Current Pattern

- Top toolbar: compact command surface.
- Center canvas: light dashed editing grid, mathematical black strokes.
- Right inspector: selected object or edge properties.
- Export panel: TikZ and Playscript output with clipboard feedback.

## Motion Rules

- Hover movement is one pixel at most.
- Draft arrows may animate their dash offset to show live gesture state.
- Copy and TeX editing feedback may fade/slide in briefly.
- Respect `prefers-reduced-motion`.

## Anti-Patterns

- Do not add hero sections, illustrations, gradients, or decorative cards.
- Do not hide mathematical controls behind vague marketing language.
- Do not use motion that distracts from grid alignment or arrow placement.
