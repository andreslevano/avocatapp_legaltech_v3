StatusTag shows a legal status with **icon + word + colour** from the `status-*` tokens; Tag is the neutral/accent label for categories.

**Statuses** (`StatusTag status=`): `vencido` (solid danger — the only filled red), `urgente` (≤ 3 días), `proximo` (4–7 días), `a-tiempo` (> 7 días), `borrador`, `en-revision`, `presentado`, `pagado`. Deadline statuses are computed by one function (`deadlineStatus()` in `tokens.ts`) — v3 has three copies of the rule (`DeadlineList.tsx`, `casos-urgentes`, `casos-vencidos`).

**Rules:** never colour alone (red/green differ in lightness *and* carry an icon). Text stays the status word; the date goes next to it, not inside. Size `sm` in tables.

**Replaces:** `ui/Tag.tsx`, 499 Tailwind default colour classes used for status (`bg-red-100 text-red-800` …), `deadlineColor()`.
