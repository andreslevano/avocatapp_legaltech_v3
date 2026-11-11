Icon renders one Lucide line icon (ISC licence) from the bundled set, replacing the 320 emoji used as icons across 39 files and the hand-pasted Heroicons paths in `layout/Rail.tsx`.

**Use when** you need a pictogram next to a label, as a status marker, or as the only content of an `IconButton`.

**Consumer provides:** `name` (Lucide id), `size` (16 · 18 · 20 · 24), optional `label` (only when the icon carries meaning *without* adjacent text), `strokeWidth` override.

**Rules**
- One set: `lucide-react` pinned (`0.460.0` here). No emoji in UI chrome, no mixing Heroicons.
- Sizes: 16 in tags/tables, 18 in buttons and inputs, 20 in nav/rail, 24 in empty states and modals. Stroke 1.75 (2 at ≤16px) so lines match DM Sans' weight.
- Colour is always `currentColor`: inherit `text`, `text-muted` or `accent-text`. Never `accent` (#B8882A) on light grounds — 2.91:1 fails 3:1 for meaningful icons.
- Decorative by default (`aria-hidden`). If the icon is the only content, the *button* gets the label, not the svg.

**Emoji → Lucide map** (counts from `src/`)

| Emoji | Uses | Lucide | Emoji | Uses | Lucide |
|---|---|---|---|---|---|
| ✅ | 62 | `circle-check` | 💳 | 5 | `credit-card` |
| ⚠ | 45 | `triangle-alert` | 🔐 🔒 | 6 | `lock-keyhole` / `lock` |
| ❌ ✕ ✗ | 48 | `circle-x` / `x` | 💼 | 4 | `briefcase` |
| 📄 | 17 | `file-text` | 📧 | 4 | `mail` |
| 📝 ✍ | 13 | `file-pen-line` / `pen-line` | 🖼 | 4 | `image` |
| 📊 | 11 | `chart-column` | 📥 📤 | 4 | `download` / `upload` |
| 🔍 | 9 | `search` | 📚 | 3 | `book-open` |
| 📋 | 8 | `clipboard-list` | 🧑‍💼 🧑 👨 | 4 | `user-round` |
| ⭐ | 8 | `star` | 📅 | 3 | `calendar-days` |
| 🔄 | 7 | `refresh-cw` | 📎 | 3 | `paperclip` |
| 🤖 ✦ | 8 | `sparkles` / `sparkle` | 💰 | 2 | `coins` / `banknote` |
| ⚖ | 5 | `scale` | ⚡ | 2 (+ToolCallBadge) | `zap` → use `loader-circle`/`check` for tool state |
| 💾 | 5 | `save` | 🌍 | 2 | `globe` |
| 🎓 | 1 | `graduation-cap` | 🏛 | 1 | `landmark` |
| 🗑 | 2 | `trash-2` | 🚫 | 2 | `ban` |
| 🛒 | 2 | `shopping-cart` | 📦 | 2 | `package` |
| 🎯 | 2 | `target` | 📢 | 1 | `megaphone` |
| 🚀 💪 | 3 | none — delete (decorative) | 🧪 | 3 | `flask-conical` (dev-only screens) |
| 🇪🇸 | 1 | text “ES” + `languages` | ✓ | 4 | `check` |

**Don't** recolour icons with CSS filters, draw icons inline per component, or use an icon without text for a destructive action.
