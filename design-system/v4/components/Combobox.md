Combobox is a text input with a filtered listbox — used for country (signup) and any list > 7 items.

**Consumer provides:** `options` `{value,label}` (defaults to the country list), `placeholder`, `defaultValue`, Field props.

**Behaviour:** accent-insensitive prefix match (“peru” finds Perú), ↑/↓ moves the active option, Enter selects, Esc closes; `role="combobox"` + `aria-activedescendant`; empty state offers a way out.

**Country list:** ISO codes stored, Spanish names shown **with accents** — México, Perú (v3 `SignupForm.tsx` hard-codes “Mexico”, “Peru”). The six launch markets stay first in data; the list here adds the remaining Spanish-speaking markets as an assumption — trim to the markets you serve.
