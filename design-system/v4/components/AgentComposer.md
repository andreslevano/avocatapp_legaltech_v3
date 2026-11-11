AgentComposer is the input area: context chips, auto-growing textarea (max 8 lines), attach / add-case buttons, send, keyboard hint, inline disclaimer.

**Rules:** label for the textarea (visually hidden); Enter sends, Shift+Enter new line, ⌘/Ctrl+Enter also sends; send disabled while empty, turns into **Detener** during streaming; placeholder in `text-muted` (v3 `#3a3630` on `#1e1c16` = 1.42:1, effectively invisible); focus ring on the whole box (`:focus-within`).

**Replaces:** `agent/AgentInput.tsx`, `ZapierChatbot.tsx` on public pages (a third-party chatbot with its own styling and no disclaimer — remove or theme it).
