IconButton is a square button whose only content is an icon; it always carries an accessible name.

**Consumer provides:** `icon`, `label` (required — becomes `aria-label` and tooltip), `variant` (same as Button, default `ghost`), `size` (`sm` 32 · `md` 40), `pressed` for toggles.

**Rules:** label is the action (“Copiar respuesta”), not the icon name. In touch layouts wrap to a 44×44 hit area. Toggles use `aria-pressed`. Destructive icon buttons only inside menus with a text label.

**Replaces:** the send button in `agent/AgentInput.tsx` (white on gold → ink on gold), close “✕” buttons in modals, the hand-built rail buttons.
