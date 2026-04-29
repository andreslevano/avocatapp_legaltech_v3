# Avocat — Claude Code Reference Document
**Actualizado:** 29 abr 2026 | **Repo:** andreslevano/avocatapp_legaltech_v3 | **Rama de trabajo:** dev

## ESTADO ACTUAL (post-deploy)
- **v3 en producción** en avocatapp.com (Firebase Hosting, SSR via web frameworks)
- Todas las sesiones de implementación completadas (S1–S5)
- Features post-deploy implementadas:
  - Landing rebuild + profile page redesign
  - Real-time plan sync + route guard para rutas Abogado-only
  - Plan-specific navigation and data isolation
  - File upload en agente (PDF, DOCX, XLSX) con drag-drop y paste
  - Document download desde el agente (Word y PDF)
- **Rama de trabajo:** `dev` — todos los commits van aquí, NO a `main`
- **Rama estable:** `main` — solo recibe merges tras QA en dev

---

## CONTEXTO COMPLETO DEL PROYECTO

### Qué es Avocat
Plataforma LegalTech con IA. Tres tipos de usuario con experiencias distintas:
- **Abogado** (€75/mes): Gestión de casos, agente IA conversacional, dashboard con KPIs y charts
- **Estudiante** (€3/escrito): Tutor socrático que guía el aprendizaje sin dar respuestas directas
- **Particular** (€50/mes): Asistente legal en lenguaje llano, sin tecnicismos

### Stack confirmado (live en avocatapp.com)
- **Framework:** Next.js 14, App Router
- **Styling:** Tailwind CSS
- **Auth:** Firebase Auth (Google OAuth + email/pw)
- **Database:** Firestore
- **Deploy:** Firebase Hosting — project ID: `avocat-legaltech-v3`
- **AI:** OpenAI GPT-4o (API key ya en el proyecto)
- **Analytics:** MS Clarity + Google Ads (mantener)
- **Chatbot actual:** Zapier widget — MANTENER solo en landing pública, eliminar dentro del app

### Estado de datos
- 157 usuarios en Firebase Auth/Firestore — NINGUNO activo
- Preservar todos los registros, no borrar nada
- Al primer login post-deploy: si `user.plan` no existe → redirect a `/onboarding`

---

## DECISIONES TOMADAS

| # | Decisión | Valor |
|---|---|---|
| 1 | Repo | github.com/andreslevano/avocatapp_legaltech_v3 |
| 2 | Rama de trabajo | `dev` — push siempre a `origin/dev`, nunca a `origin/main` |
| 3 | Firebase project | `avocat-legaltech-v3` (único, sin staging) |
| 4 | AI provider | OpenAI GPT-4o (mantener, no migrar) |
| 5 | Agente | Real API desde el inicio (no mock) |
| 6 | Zapier bot | Mantener en landing pública (`/`), eliminar dentro del app |
| 7 | Usuarios existentes | Preservar, migración suave via onboarding |

---

## DESIGN SYSTEM v3 — TOKENS EXACTOS

### Colores (tailwind.config.ts)
```ts
colors: {
  'avocat-black':     '#1e1e1e',  // nearBlack — surfaces, header, footer
  'avocat-cream':     '#F9F4EA',  // app background (sustituye #f2f2f2 frío)
  'avocat-gold':      '#B8882A',  // brand accent — CTAs, lines, tags
  'avocat-gold-l':    '#E8C97A',  // gold tint — borders, highlights
  'avocat-gold-bg':   '#FDF3DC',  // gold wash — card backgrounds
  'avocat-border':    '#C8C0B0',  // warm border (vs cold #9a9a9a)
  'avocat-muted':     '#EDE8DE',  // muted surfaces
  'avocat-gray5':     '#5f5f5f',  // secondary text
  'avocat-gray9':     '#9a9a9a',  // placeholder text
  // Dark surface tokens (para el app en dark mode)
  'ds-bg':            '#161410',
  'ds-card':          '#1e1c16',
  'ds-card2':         '#252218',
  'ds-border':        '#2e2b20',
  'ds-text':          '#c8c0ac',
  'ds-head':          '#e8d4a0',
}
```

### Tipografía (tailwind.config.ts)
```ts
fontFamily: {
  display: ['"Cormorant Garamond"', '"EB Garamond"', 'Georgia', 'serif'],
  sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
}
```

### En globals.css añadir via next/font
```ts
// app/layout.tsx
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'

const cormorant = Cormorant_Garamond({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-display'
})
const dmSans = DM_Sans({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans'
})
```

### Logo — archivos a crear en /public/logos/
Los 3 archivos PNG del logo original están en el repo (o se suben):
- `avocat-symbol.png` — ícono cuadrado solo (rail, favicon, avatar del agente)
- `avocat-stacked.png` — logo vertical completo (hero, footer, onboarding)
- `avocat-signature.png` — lockup horizontal (navbar, header del app)

---

## ARQUITECTURA DE ARCHIVOS — ESTRUCTURA NUEVA

```
app/
  (public)/                    # Rutas públicas (no requieren auth)
    layout.tsx                 # Navbar + Footer
    page.tsx                   # NUEVA landing page
    login/page.tsx             # Login redesign
    signup/page.tsx            # Signup split layout + plan cards
    onboarding/page.tsx        # NEW — post-signup plan selection
    acerca-de/page.tsx         # Mantener existente, actualizar estilos
    contacto/page.tsx          # Mantener existente
    productos/[slug]/page.tsx  # Mantener existente
    privacidad/page.tsx        # Mantener
    terminos/page.tsx          # Mantener

  (app)/                       # Rutas protegidas (requieren auth)
    layout.tsx                 # App shell: Rail + Sidebar + Main
    dashboard/page.tsx         # Dashboard KPIs + Charts (solo plan lawyer)
    agent/page.tsx             # Agentic chat (todos los planes)
    cases/page.tsx             # Lista de casos
    cases/[id]/page.tsx        # Vista de caso individual
    documents/page.tsx         # Repositorio de documentos
    clients/page.tsx           # Directorio de clientes

  api/
    agent/route.ts             # OpenAI GPT-4o streaming endpoint
    cases/route.ts             # CRUD casos Firestore
    documents/route.ts         # Gestión documentos

components/
  brand/
    Logo.tsx                   # Variantes: symbol | stacked | signature
    tokens.ts                  # Design tokens como constantes TS

  ui/
    Button.tsx                 # BtnGold, BtnDark, BtnOutlineDark, BtnOutlineGold, BtnGhost
    Tag.tsx                    # dark | light | gold | muted
    Card.tsx                   # Card, DarkCard, GoldCard
    Badge.tsx                  # Status badges
    Modal.tsx                  # Modal genérico

  layout/
    Navbar.tsx                 # Landing navbar (logo + links + CTAs)
    Footer.tsx                 # Footer completo
    AppShell.tsx               # Grid: rail + sidebar + main
    Rail.tsx                   # Icon navigation rail (52px)
    Sidebar.tsx                # Cases list sidebar (220px)
    AppHeader.tsx              # Case title + view switcher + actions

  landing/
    HeroSection.tsx            # Hero con logo + H1 Cormorant + demo
    PersonaTabs.tsx            # Abogado / Estudiante / Particular tabs
    ValueProps.tsx             # 6 features cards
    PricingSection.tsx         # 4 planes
    AgentDemo.tsx              # Mini demo interactivo del agente

  auth/
    SignupForm.tsx             # Split layout form
    LoginForm.tsx              # Split layout form
    PlanCards.tsx              # 3 plan selection cards
    GoogleAuthModal.tsx        # Google account picker modal
    OnboardingStep.tsx         # Plan confirmation post-signup

  agent/
    AgentChat.tsx              # Chat interface completa
    AgentMessage.tsx           # Burbuja AI + user + tool calls
    AgentInput.tsx             # Textarea + tools + send
    AgentWelcome.tsx           # Estado vacío con shortcuts
    ToolCallBadge.tsx          # "⚡ Leyendo archivo.pdf"
    AgentContextChips.tsx      # Chips de contexto activo

  dashboard/
    KPICard.tsx                # Metric card con trend badge
    LineChart.tsx              # Chart.js wrapper — evolución casos
    DonutChart.tsx             # Chart.js donut — estado casos
    BarChart.tsx               # Chart.js bar — tipos de caso
    RadarChart.tsx             # Chart.js radar — escritos IA
    ClientTable.tsx            # Tabla de clientes activos
    DeadlineList.tsx           # Vencimientos con semáforo

lib/
  firebase.ts                  # Firebase client config (ya existe, revisar)
  firestore.ts                 # Firestore helpers (casos, usuarios, etc.)
  openai.ts                    # OpenAI client + system prompts
  auth.ts                      # Auth helpers + hooks
  tokens.ts                    # Design tokens TS constants

types/
  user.ts                      # User, Plan, UserPlan types
  case.ts                      # Case, CaseStatus, CaseType types
  agent.ts                     # Message, ToolCall, AgentResponse types
```

---

## FIRESTORE SCHEMA

```ts
// users/{uid}
interface UserDoc {
  name: string
  email: string
  plan: 'lawyer' | 'student' | 'self' | null  // null = needs onboarding
  onboardingComplete: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// cases/{caseId}
interface CaseDoc {
  userId: string
  title: string
  type: 'civil' | 'laboral' | 'contractual' | 'familia' | 'penal' | 'sucesoral' | 'otro'
  status: 'active' | 'urgent' | 'closed' | 'archived'
  ref: string           // e.g. "AVC-2024-078"
  client: string        // client name
  deadline: Timestamp | null
  documents: string[]   // document URLs
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// conversations/{conversationId}
interface ConversationDoc {
  userId: string
  caseId: string | null
  messages: {
    role: 'user' | 'assistant'
    content: string
    toolCalls?: { name: string; result: string }[]
    timestamp: Timestamp
  }[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// clients/{clientId}
interface ClientDoc {
  userId: string        // lawyer's userId
  name: string
  email: string
  activeCases: number
  lastCaseDate: Timestamp
  status: 'active' | 'inactive'
}
```

---

## API ROUTE — AGENTE IA

```ts
// app/api/agent/route.ts
import OpenAI from 'openai'
import { NextRequest } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPTS = {
  lawyer: `Eres un agente legal inteligente especializado en Derecho español e iberoamericano. 
Tu función es ayudar a abogados profesionales a gestionar casos, redactar escritos legales, 
buscar jurisprudencia y analizar documentos. Habla con lenguaje profesional jurídico.
Cuando generes escritos, sigue los formatos oficiales del país correspondiente.
Cuando busques jurisprudencia, cita referencias reales (TS, AP, TC).
Contexto del caso activo: {caseContext}`,

  student: `Eres un tutor socrático de Derecho. Tu función NO es dar la respuesta directa, 
sino guiar al estudiante para que llegue a ella razonando. 
Antes de explicar algo, haz una pregunta que lleve al estudiante a reflexionar.
Cuando el estudiante cometa un error, no lo corrijas directamente — pregúntale por qué 
tomó esa decisión y guíale hacia la respuesta correcta.
Usa ejemplos de casos reales y sentencias para ilustrar conceptos.`,

  self: `Eres un asistente legal para personas sin formación jurídica. 
Tu función es explicar situaciones legales en lenguaje completamente llano, sin tecnicismos.
NUNCA uses artículos de ley sin explicarlos en palabras simples.
Siempre confirma primero si el usuario tiene razón legal antes de sugerir acciones.
Empodera al usuario — dile qué puede hacer él mismo antes de sugerir contratar a un abogado.
Cuando generes documentos, usa lenguaje simple y directo.`
}

export async function POST(req: NextRequest) {
  const { message, caseContext, history, userPlan } = await req.json()
  
  const systemPrompt = SYSTEM_PROMPTS[userPlan as keyof typeof SYSTEM_PROMPTS]
    .replace('{caseContext}', JSON.stringify(caseContext || {}))

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ],
    max_tokens: 2000,
    temperature: 0.7
  })

  // Return streaming response
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    }
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

---

## ROUTING POST-LOGIN POR PLAN

```ts
// app/(app)/layout.tsx — lógica de redirección
// Después de verificar auth:

if (!user.plan || !user.onboardingComplete) {
  redirect('/onboarding')
}

switch (user.plan) {
  case 'lawyer':
    // Acceso completo: dashboard + agent + cases + clients
    // Default route: /dashboard
    break
  case 'student':
    // Sin dashboard KPIs, sin cases management
    // Default route: /agent (modo tutor)
    break  
  case 'self':
    // Sin dashboard KPIs, sin cases management
    // Default route: /agent (modo feature grid)
    break
}
```

---

## MIGRACIÓN SUAVE DE USUARIOS EXISTENTES

```ts
// lib/firestore.ts — getUserPlan
export async function ensureUserDoc(uid: string, email: string, name: string) {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  
  if (!userSnap.exists()) {
    // Usuario nuevo — crear doc
    await setDoc(userRef, {
      name, email,
      plan: null,
      onboardingComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } else {
    // Usuario existente — si no tiene plan, necesita onboarding
    const data = userSnap.data()
    if (!data.plan) {
      // No hacer nada aquí — el layout lo detectará y redirigirá a /onboarding
    }
  }
}
```

---

## VARIABLES DE ENTORNO NECESARIAS

```bash
# .env.local — verificar que estas existen
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=avocat-legaltech-v3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=avocat-legaltech-v3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=avocat-legaltech-v3.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
OPENAI_API_KEY=...                    # Ya debe existir
```

---

## DEPENDENCIAS A INSTALAR

```bash
# Dependencias principales (ya instaladas):
npm install chart.js react-chartjs-2   # Charts en dashboard
npm install openai                      # OpenAI SDK >=4
npm install firebase                    # Firebase SDK
npm install next                        # Next.js 14+
npm install docx jspdf html2canvas     # Generación de documentos
npm install mammoth                     # Lectura de archivos DOCX en el agente
npm install esbuild                     # Build tooling
```

---

## ZAPIER — QUÉ HACER

El Zapier chatbot es un hook comercial para visitantes en la landing. Plan:

```tsx
// app/(public)/layout.tsx
// Mostrar Zapier SOLO en rutas públicas (landing, precios, etc.)
// El script zapier-interfaces.esm.js va en el <head> del public layout ÚNICAMENTE
// NO en el app layout (rutas protegidas)

// En app/(app)/layout.tsx — NO incluir el script de Zapier
// El agente nativo reemplaza completamente la función dentro del app
```

---

## ORDEN DE EJECUCIÓN PARA CLAUDE CODE

### SESIÓN 1 — F1: Code Review + F2: Design System
```
1. git clone https://github.com/andreslevano/avocatapp_legaltech_v3.git
2. git checkout dev
3. npm install
4. Mapear estructura actual del repo
5. Identificar componentes existentes reutilizables
6. Revisar firebase.ts, auth config, Firestore rules
7. Revisar tailwind.config.ts y globals.css actuales
8. Listar deuda técnica encontrada
9. Actualizar tailwind.config.ts con design tokens v3
10. Actualizar globals.css con CSS variables y next/font
11. Crear /components/brand/Logo.tsx
12. Crear /components/ui/Button.tsx (4 variantes)
13. Crear /components/ui/Tag.tsx (4 variantes)  
14. Crear /components/ui/Card.tsx
15. Crear /lib/tokens.ts
16. Subir logos PNG a /public/logos/
17. npm run build — verificar sin errores
18. git add . && git commit -m "feat: design system v3"
```

### SESIÓN 2 — F3: Landing + F4: Auth
```
19. Crear app/(public)/page.tsx — nueva landing
20. Crear components/landing/ — HeroSection, PersonaTabs, ValueProps, Pricing, AgentDemo
21. Crear app/(public)/login/page.tsx — split layout
22. Crear app/(public)/signup/page.tsx — split layout + PlanCards
23. Crear app/(public)/onboarding/page.tsx
24. Crear components/auth/ — todos los componentes
25. Actualizar lib/auth.ts con ensureUserDoc + plan routing
26. npm run build — verificar
27. git commit -m "feat: landing + auth flow"
```

### SESIÓN 3 — F5a: App Shell + Agent
```
28. Crear app/(app)/layout.tsx — AppShell con auth guard
29. Crear components/layout/ — Rail, Sidebar, AppHeader
30. Crear app/(app)/agent/page.tsx
31. Crear components/agent/ — AgentChat, AgentMessage, AgentInput, etc.
32. Crear app/api/agent/route.ts — OpenAI GPT-4o streaming
33. Crear lib/openai.ts con system prompts por plan
34. Implementar routing post-login por plan
35. npm run build — verificar
36. git commit -m "feat: agentic chat interface"
```

### SESIÓN 4 — F5b: Dashboard + Firestore
```
37. Instalar chart.js + react-chartjs-2
38. Crear app/(app)/dashboard/page.tsx
39. Crear components/dashboard/ — todos los charts y tablas
40. Crear app/(app)/cases/page.tsx + [id]/page.tsx
41. Crear lib/firestore.ts — helpers para casos, clientes, conversaciones
42. Crear app/api/cases/route.ts — CRUD
43. Conectar datos reales desde Firestore en dashboard
44. npm run build — verificar
45. git commit -m "feat: dashboard + firestore integration"
```

### SESIÓN 5 — F6: QA + F7: Deploy
```
46. Lighthouse audit — fix issues bloqueantes
47. Test auth flow completo
48. Test responsive 375px / 768px / 1440px
49. Verificar env vars en producción
50. npm run build — build final
51. firebase deploy --only hosting --project avocat-legaltech-v3
52. Smoke test en avocatapp.com
53. git commit -m "chore: production deploy v2.0"
54. git push origin dev
```

---

## PROMPT EXACTO PARA INICIAR CLAUDE CODE — SESIÓN 1

Copia y pega esto en Claude Code para arrancar:

```
Eres mi ingeniero principal en este proyecto. Vamos a implementar un rediseño 
completo de Avocat (avocatapp.com), una plataforma LegalTech con Next.js 14.

REPOSITORIO: https://github.com/andreslevano/avocatapp_legaltech_v3.git
RAMA DE TRABAJO: dev
FIREBASE PROJECT: avocat-legaltech-v3
AI: OpenAI GPT-4o (la API key ya está en .env.local)

SESIÓN 1 — OBJETIVOS:
1. Clonar el repo y hacer checkout a la rama dev
2. Auditar la estructura actual: directorios, componentes, Firebase config, Tailwind config
3. Generar un reporte de deuda técnica encontrada
4. Implementar el Design System v3:
   - Actualizar tailwind.config.ts con los nuevos tokens de color y tipografía
   - Actualizar globals.css con CSS variables
   - Integrar Cormorant Garamond + DM Sans via next/font en app/layout.tsx
   - Crear /components/brand/Logo.tsx con variantes: symbol, stacked, signature
   - Crear /components/ui/Button.tsx con variantes: BtnGold, BtnDark, BtnOutlineDark, BtnOutlineGold, BtnGhost
   - Crear /components/ui/Tag.tsx con variantes: dark, light, gold, muted
   - Crear /components/ui/Card.tsx
   - Crear /lib/tokens.ts con todos los design tokens como constantes TypeScript
5. Verificar que npm run build pasa sin errores
6. Hacer commit con mensaje "feat: design system v3 — brand tokens, typography, base components"

TOKENS DE COLOR EXACTOS:
- avocat-black: #1e1e1e
- avocat-cream: #F9F4EA (app background)
- avocat-gold: #B8882A (brand accent)
- avocat-gold-l: #E8C97A
- avocat-gold-bg: #FDF3DC
- avocat-border: #C8C0B0
- avocat-muted: #EDE8DE
- ds-card: #1e1c16 (dark surface card)
- ds-card2: #252218
- ds-border: #2e2b20

TIPOGRAFÍA:
- font-display: Cormorant Garamond (headings, H1-H3, taglines)
- font-sans: DM Sans (UI, buttons, body, labels)

IMPORTANTE:
- No tocar la rama main
- Preservar todos los archivos existentes que no se estén reemplazando
- Los 157 usuarios en Firebase Auth/Firestore no deben ser afectados
- Reportar cualquier problema encontrado antes de proceder al siguiente paso

Empieza con: git clone + checkout + npm install + auditoría completa del repo.
```

---

## CHECKLIST PRE-IMPLEMENTACIÓN

- [ ] Acceso al repo confirmado (andreslevano/avocatapp_legaltech_v3)
- [ ] Rama dev — trabajo aquí, no en main
- [ ] Firebase project ID: avocat-legaltech-v3
- [ ] OpenAI API key en .env.local ✓
- [ ] 157 usuarios — preservar, migración suave
- [ ] Zapier bot: mantener en public layout, eliminar en app layout
- [ ] Design tokens v3 documentados ✓
- [ ] Arquitectura de archivos definida ✓
- [ ] Firestore schema definido ✓
- [ ] API route del agente especificada ✓
- [ ] Orden de sesiones definido ✓

---

*Avocat LegalTech — Claude Code Implementation Plan v1.0 — 24 abr 2026*
