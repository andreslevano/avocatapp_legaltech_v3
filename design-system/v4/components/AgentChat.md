AgentChat is the agent workspace layout: scrollable log (`role="log"`) centred at 760px + sticky composer. Empty state = AgentWelcome: three suggested prompts tailored to plan, and the case picker.

**Modes by plan:** Abogados (precise, citations on, tool ids visible), Particulares (plain language, glossary popovers, “¿Necesitas un abogado?” escalation card), Estudiantes (Socratic: asks before answering, citations as reading list).

**Layout:** full page in `(app)/agent`; as a 400px docked panel beside case detail ≥ 1280px; full-screen sheet on mobile with BottomNav hidden.

**Replaces:** `agent/AgentChat.tsx`, `agent/AgentWelcome.tsx`.
