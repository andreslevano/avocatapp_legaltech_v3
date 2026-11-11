ToolCallBadge shows a step the agent ran (search case law, read document, compute deadline): mono label + state icon.

**States:** `running` (spinning `loader-circle`, `accent-text`), `done` (`check`, `success-text`), `error` (`circle-alert`, `danger` border). Labels should be human (“Buscando jurisprudencia”) in Particulares mode; tool ids are fine for Abogados. Group > 3 badges into “4 pasos · ver detalle”.

**Replaces:** `agent/ToolCallBadge.tsx` (⚡ emoji pulsing, `#252218`/`#2e2b20`/`#c8c0ac` raw hex).
