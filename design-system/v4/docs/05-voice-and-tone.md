# Voice & tone (Spanish)

One voice — **calm, exact, on your side** — in two registers. Write the Spanish first; translate from it.

## Registers

| | Abogados | Particulares | Estudiantes |
|---|---|---|---|
| Goal | Save time without losing rigour | Understand and act without fear | Learn to reason |
| Vocabulary | Procedural terms, abbreviations they use (NIG, JPI, AP, ECLI) | Everyday words; legal term once, explained | Correct terms, defined on first use |
| Sentences | Short, declarative | Short, second person, next step explicit | Questions that lead |
| Citations | Always, with reference | Only when it helps (“lo dice el art. 1101 del Código Civil”) | As a reading list |
| Example — empty cases | “Sin casos activos. Crea uno o impórtalo desde un PDF.” | “Aún no tienes reclamaciones. Empieza respondiendo 5 preguntas.” | “Elige un caso práctico para empezar.” |
| Example — deadline | “Contestación a la demanda · vence el 12 nov (mañana).” | “Tienes hasta el **12 de noviembre** para responder. Te avisaremos 3 días antes.” | — |
| Example — AI answer intro | “Sí. La reclamación judicial equivale a la interpelación (art. 1100 CC)…” | “Sí, puedes pedir intereses. Te explico por qué y qué necesitas…” | “Antes de responder: ¿qué efecto crees que tiene presentar la demanda?” |

**Always:** say what happens next, what it costs, and how long it takes. **Never:** promise outcomes (“ganarás”), say “sin conocimientos jurídicos” without the review notice, blame the user in errors, or use exclamation marks in errors.

## Glossary — no English in the interface

| Instead of | Write | Notes |
|---|---|---|
| Dashboard | **Panel** | Rail item, page title, plan features |
| Dashboard KPIs | Indicadores | |
| Demo / Demo interactivo / Ver demo | **Demostración** / Demostración interactiva / Ver cómo funciona | |
| Template DOCX / PDF | Plantilla en Word / PDF | |
| GDPR Compliant | Cumplimos el RGPD — only linked to the evidence page | RGPD is the Spanish acronym |
| Uptime 99.9% | remove, or “Estado del servicio” linking to a status page | |
| LegalTech (title tag) | Plataforma jurídica con IA | |
| Login / Logout / Último Login | Iniciar sesión / Cerrar sesión / Último acceso | |
| Email (label) | Correo electrónico (label) · email (in running text is fine) | |
| Upload / Download | Subir / Descargar | |
| Chat | Conversación (UI) · Agente IA (product name) | |
| Tools | Herramientas | |
| Modo Agente | Agente IA | one name for the feature |
| Autoservicio / Plan Particular / Particular | **Particulares** (plan & persona) | one name |
| Abogado (signup) / Abogados | **Abogados** | plural for plans, singular in persona tabs (“Soy abogado”) |
| Prueba gratis / Comenzar / Empezar ahora / Comenzar gratis | **Probar 14 días gratis** (Abogados) · **Crear mi escrito** (Particulares) · **Empezar a practicar** (Estudiantes) | one CTA per persona |
| €75 · 1,200 · 85% | 75 € · 1.200 · 85 % | es-ES number format |
| Mexico, Peru | México, Perú | ISO code in data |

## es-ES vs LATAM

Default **es-ES**. Add **es-419** as a shared LATAM base with country overrides only where law or usage differs:

| Concept | es-ES | Colombia | México | Chile | Perú |
|---|---|---|---|---|---|
| ID | DNI / NIE | cédula de ciudadanía | CURP / INE | RUT | DNI |
| Tax ID | NIF | NIT | RFC | RUT | RUC |
| Small claim | reclamación de cantidad · monitorio | demanda de mínima cuantía | juicio oral mercantil | juicio ejecutivo (cobro de títulos) | proceso sumarísimo |
| Constitutional protection | recurso de amparo | **acción de tutela** | juicio de amparo | recurso de protección | proceso de amparo |
| Lawyer | abogado | abogado | abogado / licenciado | abogado | abogado |
| Computer | ordenador | computador | computadora | computador | computadora |
| Currency | € | COP | MXN | CLP | PEN |

- The table is indicative for UI vocabulary; each country content pack is validated by local counsel.
- The product must say per country what's available: today only reclamación de cantidad (ES) and acción de tutela (CO) exist; Chile, Ecuador, México, Perú at signup get the agent but no specific procedures. Copy: “Disponible en España y Colombia. Para otros países, el agente te orienta con la normativa general.”
- `vosotros` never appears (UI addresses one user with `tú`); avoid `vos`.
- Legal terms are never translated literally across countries; they come from the country's content pack.
- Dates `dd/mm/aaaa` in all markets; currency follows the country.

## Other locales (en-GB, pt-BR, it, nl)

The repo ships `public/locales/{es,en-GB,pt-BR,it,nl}/common.json` (~188 keys each) but most UI strings are hard-coded Spanish and the legal content is Spain/Colombia-specific. Recommendation:
1. Keep Spanish only in the public UI until a locale is **100 % covered** — a half-translated legal product is worse than a Spanish one.
2. Externalise strings (`t('key')`) as components migrate to v4; the CI guard can flag JSX text literals.
3. **pt-BR** is the natural next market (LATAM, Brazil's procedural law needs its own content pack). en-GB, it and nl only with country-specific legal content, never as UI translations over Spanish law.
4. Language and country are two settings (a Spanish speaker in Colombia ≠ es-ES), set at signup and in UserProfilePanel; the marketing switcher shows only complete locales, as text (“Español”), not flags.

## Microcopy patterns

- **Errors:** what happened + whether anything was lost or charged + what to do. “No hemos podido generar el documento. No se te ha cobrado. Inténtalo de nuevo.”
- **Confirmations:** the object and the consequence. “¿Eliminar el caso? Se eliminarán sus 6 documentos.”
- **Empty states:** what's missing + why it's useful + one action.
- **Long jobs:** “Suele tardar 40–60 s. Puedes salir: te avisaremos.”
- **Prices:** amount, period, taxes: “10 € por escrito, IVA incluido”.
