AgentMessage renders one turn: the user's message (right, `surface-raised` bubble) or the assistant's (left, full width, no bubble, with avatar, tool calls, citations and actions).

**Consumer provides:** `role`, `children` (rendered Markdown → paragraphs, lists, `sup` citation links), `tools`, `sources`, `streaming`, `meta`, `actions`.

**Spec:** 15/24 DM Sans (v3: 13px), measure ≤ 760px, `text` on `bg` (9.4:1 dark). User bubble no longer gold (white on gold was 3.19:1). Assistant actions: Copiar · Exportar a Word · Regenerar · útil / mejorable.

**Streaming:** gold caret, `aria-busy="true"` on the message, the log is `role="log"` `aria-live="polite"` (announce on completion, not per token), **Detener** button visible while streaming, scroll follows only if the user is at the bottom.

**Errors:** inline Alert in place of the answer with Reintentar; never an empty bubble (v3 renders `''` when content is empty).

**Replaces:** `agent/AgentMessage.tsx` (plain-text `whitespace-pre-wrap`, so no Markdown, lists or citations).
