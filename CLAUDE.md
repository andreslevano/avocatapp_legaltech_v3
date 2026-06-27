# Avocat — Claude Code Reference Document
**Actualizado:** 27 jun 2026 | **Repo:** andreslevano/avocatapp_legaltech_v3

---

## ESTADO ACTUAL

- **Producción:** avocatapp.com (Firebase Hosting SSR, project `avocat-legaltech-v3`)
- **Rama de trabajo:** `dev` — push siempre a `origin/dev`, NUNCA a `origin/main`
- **Rama estable:** `main` — solo recibe merges tras QA en dev

### Features implementadas (completo)
- Design system v3 (tokens, tipografía, componentes base)
- Landing page + auth flow (login, signup, onboarding, migración suave de 157 usuarios)
- App shell (Rail + Sidebar + AppHeader) con route guard por plan
- Agente IA — streaming GPT-4o, tres personas (Abogados / Estudiantes / Autoservicio)
- Dashboard Abogados — KPIs Chart.js, lista de casos, clientes, vencimientos
- File upload en agente — drag-drop, paste, PDF/DOCX/XLSX (extracción server-side)
- **Documentos:** generación automática Word/PDF, guardado en Firebase Storage, área `/documents`
- **Contexto de caso en agente:** navegación desde caso → agente con 4 acciones contextualizadas
- **Carga automática de documentos del caso:** al abrir el agente desde un caso, los documentos adjuntos se inyectan automáticamente en el primer mensaje
- Firestore rules + indexes desplegados (`firebase deploy --only firestore`)
- **Firestore rules — seguridad por colección:** ownership por `userId` para `cases`, `clients`, `conversations`, `documents`, `users/{userId}`, `uploaded_files`; `purchases` solo lectura; catch-all final `allow read, write: if false`. 33 tests en emulador.
- **`/tools/analisis`** — drop-zone única, extracción silenciosa, `?docId=X` carga directo desde `/documents`
- **`/tools/generacion`** — two-level type selection (5 áreas × 5 tipos = 25 tipos), formulario estructurado (partes/hechos/fechas/jurisdicción/campos específicos/doc referencia), validación pre-generación, auto-save + descarga manual
- **`/documents`** — rediseño completo: tabla ordenable, multi-filter bar, split-pane con panel de preview, context menu, inline rename, bulk actions (ZIP/delete/link), drag-drop upload, upload toast con "Vincular a caso?"
- **`/cases/[id]`** — documentos del caso ahora desde colección `documents` (`getCaseDocuments()`); picker vincula docs existentes via `updateDocumentMeta` en lugar de re-subir
- **Dashboard/Clientes** — count de casos activos computado en vivo desde el array de casos (no campo `activeCases` obsoleto de Firestore)
- **Sidebar** — fix: filtro no perdía el foco al escribir (componente interno convertido a variable JSX)
- **Mobile** — bottom nav para Abogados muestra Casos/Agente IA/Herramientas/Documentos (4 items prioritarios + Perfil); menú de usuario posicionado sobre la barra inferior

---

## PROYECTO

### Qué es Avocat
Plataforma LegalTech con IA. Tres tipos de usuario:
- **Abogados** (`plan: 'Abogados'`, €75/mes): Dashboard KPIs, gestión de casos, agente IA jurídica
- **Estudiantes** (`plan: 'Estudiantes'`, €3/escrito): Tutor socrático
- **Autoservicio** (`plan: 'Autoservicio'`, €50/mes): Asistente en lenguaje llano

### Stack
- **Framework:** Next.js 14, App Router
- **Styling:** Tailwind CSS (design tokens en `tailwind.config.ts`)
- **Auth:** Firebase Auth (Google OAuth + email/pw)
- **Database:** Firestore
- **Storage:** Firebase Storage — bucket `avocat-legaltech-v3.firebasestorage.app`
- **Deploy:** Firebase Hosting (web frameworks / SSR) — `us-central1`
- **AI:** OpenAI GPT-4o — `max_tokens: 4000`, streaming
- **Analytics:** MS Clarity + Google Ads (mantener)
- **Chatbot:** Zapier widget — SOLO en layout público (`(public)/layout.tsx`), NO en app

---

## DECISIONES CLAVE

| # | Decisión | Valor |
|---|---|---|
| 1 | Repo | github.com/andreslevano/avocatapp_legaltech_v3 |
| 2 | Rama de trabajo | `dev` — push a `origin/dev`, nunca `origin/main` |
| 3 | Firebase project | `avocat-legaltech-v3` (único, sin staging) |
| 4 | AI provider | OpenAI GPT-4o (no migrar) |
| 5 | Tokens máximos | 4000 (documentos legales pueden ser largos) |
| 6 | Usuarios existentes | 157 en Firestore — preservar, migración suave via `/onboarding` |
| 7 | Documentos generados | Auto-save a Firebase Storage, sin botones inline en cada mensaje |
| 8 | Documentos del caso | Leer desde colección `documents` con `getCaseDocuments()`, no de `case.documentRefs` |
| 9 | Count casos activos | Calculado en vivo en cliente desde array de casos, no campo `activeCases` de Firestore |

---

## DESIGN SYSTEM v3

### Colores (`tailwind.config.ts`)
```ts
colors: {
  'avocat-black':   '#1e1e1e',
  'avocat-cream':   '#F9F4EA',  // app background
  'avocat-gold':    '#B8882A',  // brand accent — CTAs
  'avocat-gold-l':  '#E8C97A',
  'avocat-gold-bg': '#FDF3DC',
  'avocat-border':  '#C8C0B0',
  'avocat-muted':   '#EDE8DE',
  'avocat-gray5':   '#5f5f5f',
  'avocat-gray9':   '#9a9a9a',
  // Dark surface tokens (app interior)
  'ds-bg':     '#161410',
  'ds-card':   '#1e1c16',
  'ds-card2':  '#252218',
  'ds-border': '#2e2b20',
  'ds-text':   '#c8c0ac',
  'ds-head':   '#e8d4a0',
}
```

### Tipografía
- `font-display`: Cormorant Garamond — headings, títulos, taglines
- `font-sans`: DM Sans — UI, botones, body, labels

---

## ARQUITECTURA DE ARCHIVOS

```
src/app/
  (public)/               # Sin auth — landing, login, signup, onboarding
  (app)/                  # Con auth guard (AppAuthContext)
    layout.tsx            # AppShell + plan guard
    agent/page.tsx        # Agente IA — lee ?caseId, ?caseTitle, ?caseType, ?caseClient
    documents/page.tsx    # Repositorio — split-pane tabla/preview, filtros, bulk actions
    cases/[id]/page.tsx   # Detalle de caso — docs desde colección documents
    dashboard/page.tsx    # Solo Abogados
    clients/page.tsx      # Lista de clientes — count activos calculado en vivo
    tools/
      analisis/page.tsx   # Drop-zone + ?docId=X (Suspense + useSearchParams)
      generacion/page.tsx # Two-level type selection + formulario estructurado + auto-save

src/components/
  agent/
    AgentChat.tsx         # Orquesta mensajes, auto-save docs, carga docs del caso
    AgentMessage.tsx      # Burbuja — solo botón copiar (sin Word/PDF inline)
    AgentInput.tsx        # Textarea + drag-drop upload
    AgentWelcome.tsx      # Estado vacío — acciones genéricas o contextualizadas por caso
    ToolCallBadge.tsx
  documents/              # ← NUEVA carpeta
    DocTable.tsx          # Tabla ordenable, context menu fijo, inline rename
    DocPreviewPanel.tsx   # Panel preview (PDF iframe / imagen / fallback)
    DocFiltersBar.tsx     # Barra multi-filtro (search/caso/cliente/tipo/fecha/estado)
    modals.tsx            # LinkCaseModal, LinkClientModal, DeleteConfirmModal
    helpers.ts            # inferDocType, inferStatus, applyFilters, sortDocs, STATUS_STYLE, TIPO_STYLE
  layout/
    Rail.tsx              # Desktop rail + mobile bottom nav (MOBILE_NAV_ABOGADOS para Abogados)
    Sidebar.tsx           # Navegación lateral expandible
    AppHeader.tsx         # Header por página
    UserProfilePanel.tsx  # Portal — detecta anchor desde bottom bar mobile para posicionarse arriba

src/lib/
  agent-prompts.ts        # Prompts por plan — incluye REGLA CRÍTICA para generación de docs
  agent-export.ts         # isLegalDocument(), buildWordBlob(), downloadAsWord/Pdf(), saveAnalysisDocument()
  storage-client.ts       # saveDocumentToStorage(), uploadDocument(), getUserDocuments(),
                          # getCaseDocuments(), getDocumentById(), updateDocumentMeta(),
                          # deleteDocumentRecord(), formatBytes()
  storage-paths.ts        # Helpers de rutas Storage
  firestore.ts            # getCase(), getCases(), getClients(), updateCase(), etc.
  auth.ts                 # ensureUserDoc(), getDashboardRoute()
  firebase.ts             # Firebase client (Auth, Firestore, Storage, Functions)

src/app/api/
  agent/route.ts          # POST streaming — extrae texto de PDF/DOCX/XLSX server-side
  agent-v2/route.ts       # Agente con tool-calling (Claude Sonnet / RAG pipeline)
  documents/
    embed/route.ts        # POST — indexa un documento para RAG (Vertex AI embeddings)
    embed-all/route.ts    # POST — reindexar todos los docs del usuario
```

---

## FIRESTORE SCHEMA

```ts
// users/{uid}
{ name, email, plan: 'Abogados'|'Estudiantes'|'Autoservicio'|null,
  onboardingComplete: boolean, isActive, isAdmin, role,
  country?: string, createdAt, updatedAt }

// cases/{caseId}
{ userId, title, type: 'civil'|'laboral'|'contractual'|'familia'|'penal'|'sucesoral'|'otro',
  status: 'active'|'urgent'|'closed'|'archived',
  ref, client, clientId?: string, deadline, notes,
  assessment?: object, comments?: object[],
  createdAt, updatedAt }
// NOTA: documentRefs[] en el caso está deprecated — usar colección documents con caseId

// documents/{docId}          ← colección principal de documentos
{ userId,
  caseId:    string | null,
  clientId?: string | null,   // vínculo directo a cliente (independiente del caso)
  name, type (ext), size,
  storagePath, downloadUrl,
  pdfDownloadUrl?: string,    // presente si se generó PDF además de Word
  source: 'generated'|'uploaded',
  status?: 'Borrador'|'Generado'|'Firmado'|'Enviado',
  createdAt }

// conversations/{id}
{ userId, caseId, messages: [{role, content, toolCalls?, timestamp}], createdAt, updatedAt }
```

**Índices Firestore** (en `firestore.indexes.json`, ya desplegados):
- `documents`: `userId ASC + createdAt DESC`
- `documents`: `userId ASC + caseId ASC + createdAt DESC`

---

## FIREBASE STORAGE — JERARQUÍA DE RUTAS

```
users/{userId}/{planFolder}/{section}/{timestamp}_{filename}

planFolder:  abogado | estudiante | autoservicio
section:     generacion-escritos      ← documentos sin caso asociado
             casos/{caseId}           ← documentos vinculados a un caso
```

Ejemplos:
```
users/abc123/abogado/generacion-escritos/1746000000_Demanda_Civil.doc
users/abc123/abogado/casos/yDywEjjnCx4f/1746000001_Contrato.doc
```

Reglas Storage: `storage.rules` — path `/users/{userId}/{allPaths=**}` permite al owner.

---

## AGENTE IA — COMPORTAMIENTO CLAVE

### Generación de documentos
- El sistema prompt de Abogados incluye una **REGLA CRÍTICA**: el agente debe generar el documento completo en su respuesta, nunca decir que no puede crear archivos.
- Formato obligatorio: `#` título, `##` secciones, `**negrita**` para datos clave.
- `isLegalDocument()` detecta la respuesta y auto-guarda en Firebase Storage.
- Toast de 5s aparece con link de descarga directa.

### Contexto de caso
- Desde un caso real: `/agent?caseId={id}` — el agente carga el caso y sus documentos.
- `AgentWelcome` muestra 4 acciones contextualizadas según el tipo de caso.
- En el primer mensaje con caso, los documentos del caso se descargan de Storage y se inyectan como adjuntos binarios para extracción server-side.

### Sin botones inline Word/PDF
- Los botones de descarga Word/PDF se eliminaron de `AgentMessage`.
- Los documentos generados se guardan automáticamente y aparecen en `/documents`.
- Solo queda el botón "Copiar" en cada mensaje.

---

## PÁGINA /documents — COMPORTAMIENTO CLAVE

- **Split-pane**: tabla ocupa `flex-1`, panel preview `w-[360px]` a la derecha en desktop; bottom sheet en mobile.
- **DocTable**: 8 columnas (checkbox, nombre, tipo, caso, cliente, fecha, estado, "…"); context menu en posición `fixed` calculada con `getBoundingClientRect()`; inline rename con input que reemplaza la celda nombre.
- **DocFiltersBar**: search + caso + cliente + tipo + date range + estado; badge con count de filtros activos.
- **Bulk actions bar**: aparece al seleccionar ≥1 doc — vincular caso, descargar ZIP (jszip), eliminar.
- **Drag-drop**: overlay en toda la página; el archivo se sube con `uploadDocument()`.
- **Upload toast**: 6s con "Vincular a caso? →" que abre `LinkCaseModal`.
- **`?docId=X` en /tools/analisis**: carga y extrae el doc automáticamente al abrir la página.

---

## MOBILE NAV — COMPORTAMIENTO CLAVE

- **Bottom bar Abogados**: `MOBILE_NAV_ABOGADOS` = [Casos, Agente IA, Herramientas, Documentos] + Perfil (5 slots). No usar `navItems.slice(0,4)` para Abogados o se pierden Herramientas y Documentos.
- **UserProfilePanel mobile**: la ancla viene del `mobileAvatarBtnRef` (botón Perfil del bottom bar). El panel detecta `anchorRect.top > window.innerHeight * 0.7` y se posiciona con `right: 8, bottom: window.innerHeight - anchorRect.top + 8` (sobre la barra). No uses el `avatarBtnRef` desktop (elemento oculto con `display:none`) para posicionar en mobile — su `getBoundingClientRect()` devuelve ceros y el panel queda fuera de pantalla.

---

## VARIABLES DE ENTORNO

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=avocat-legaltech-v3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=avocat-legaltech-v3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=avocat-legaltech-v3.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
OPENAI_API_KEY=...
```

---

## DEPENDENCIAS INSTALADAS

```bash
chart.js react-chartjs-2   # Dashboard charts
openai                      # SDK >=4, GPT-4o
firebase                    # Auth + Firestore + Storage
next                        # 14+, App Router
docx jspdf html2canvas      # Generación de documentos
mammoth                     # Extracción texto DOCX
jszip                       # Bulk ZIP download en /documents
esbuild                     # Build tooling
```

---

## COMANDOS FRECUENTES

```bash
npm run dev                                                    # Dev server
npm run build                                                  # Verificar antes de push
git push origin main:dev                                       # Push a dev (SIEMPRE así)
firebase deploy --only hosting --project avocat-legaltech-v3   # Deploy producción
firebase deploy --only firestore --project avocat-legaltech-v3 # Deploy rules + indexes
```

---

*Avocat LegalTech — Claude Code Reference v2.2 — 27 jun 2026*
