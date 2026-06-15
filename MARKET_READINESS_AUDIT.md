# Avocat — Market Readiness Audit
**Fecha:** 13 jun 2026 | **Rama auditada:** `main` | **Tipo:** Auditoría read-only, sin cambios de código

---

## Resumen ejecutivo

El repo contiene **dos productos superpuestos**:

1. **"Motor legacy" (Colombia, pay-per-document)** — Acción de Tutela y Reclamación de Cantidades, construidos sobre Cloud Functions + Stripe Payment Links + Firestore. **Esto funciona end-to-end hoy**: pago → webhook → generación de PDF/DOCX → historial. Es, con diferencia, la parte más madura del sistema.
2. **"Avocat v3" (shell nuevo, España/Abogados)** — auth, onboarding, planes (Abogados/Estudiantes/Autoservicio), `(app)/agent`, `(app)/cases`, `(app)/clients`, `(app)/documents`, `(app)/tools/*`, dashboard con KPIs. Es la capa descrita en `CLAUDE.md` v2.0. Funciona para los flujos principales pero tiene huecos de producto reales (suscripciones, "agente" sin tools, varias páginas legacy mockeadas/huérfanas).

El plan **Autoservicio** vive en la intersección: su navegación nueva (`(app)/tools`) apunta a las páginas legacy de Tutela/Reclamación, que sí son reales. Eso es bueno — pero varias otras páginas legacy (`generar-escritos`, `auditoria-legal`, `repositorio`, `casos-*`, `administrador`) quedaron a medio migrar: existen, algunas son alcanzables, y están mockeadas o rotas.

**Hallazgo más urgente — no es de producto, es de seguridad**: la regla "catch-all" en `firestore.rules` (línea 35-37) permite que **cualquier usuario autenticado lea/escriba cualquier documento** de la base de datos (casos, clientes, conversaciones, purchases, perfiles de otros usuarios). Esto es un fallo crítico de aislamiento de datos entre tenants y debería corregirse antes de cualquier campaña de adquisición.

**Estimación de completitud global: ~65-70%.** Páginas legales/marketing y el motor de pagos legacy están casi listos; los huecos están en gestión de suscripción, coherencia del "agente", y limpieza de páginas legacy mockeadas/huérfanas.

---

## 1. Matriz de funcionalidades

| Feature | Estado | Bloqueante | Esfuerzo para cerrar |
|---|---|---|---|
| Landing, `acerca-de`, `productos/*`, `contacto` | **Done** | — | — |
| Legales: `terminos`, `privacidad`, `cookies`, `gdpr` | **Done** | — | — |
| Auth: login, signup, onboarding, forgot/reset-password | **Done** | Verificar que el alta crea doc en `users/{uid}` (bug histórico de USER_DOCUMENT_FIX_SUMMARY.md) | 1 prueba E2E (horas) |
| Dashboard Abogados (KPIs, casos, clientes, vencimientos) | **Done** | — | — |
| `(app)/cases`, `(app)/clients` (Abogados) | **Done** | — | — |
| `(app)/documents` (subida + Storage) | **Done** | — | — |
| `(app)/agent` + `/api/agent` (chat streaming GPT-4o, adjuntos PDF/DOCX/XLSX/imagen) | **Partial** | Conversacional puro: sin function/tool-calling real, sin persistencia de historial server-side, sin rate limiting | 1-3 semanas (según alcance prometido) |
| `(app)/tools/analisis` + `/api/tools/analisis` | **Done** | — | — |
| `(app)/tools/generacion` (vía `/api/agent`) | **Done** | — | — |
| `(app)/tools/extraccion-datos`, `(app)/tools/revision-email` | **Partial** | Usan `/api/agent` genérico en vez de endpoint dedicado; sin persistencia consistente | 2-3 días |
| **Acción de Tutela** (Autoservicio) — pago → webhook → PDF/DOCX → historial | **Done** | — | — |
| **Reclamación de Cantidades** (Autoservicio) | **Done** | Dato de trabajador hardcodeado (`ReclamacionProcessSimple.tsx:64` `'María García López'`) | Medio día |
| Stripe checkout (signup planes, Tutela, Reclamación) vía Cloud Function `createCheckoutSession` | **Done** | Solo `/dev/stripe-reclamacion-test` apunta a ruta `.disabled` y rompe | Eliminar página dev (minutos) |
| Stripe webhook (`functions/src/index.ts: stripeWebhook`) | **Done** (con matices) | Procesamiento async sin timeout/retry/DLQ → riesgo de "compra pagada, documento nunca generado" | 2-3 días (cola/retry) |
| `/subscription` (cancelar/upgrade plan) | **Stub** | `handleCancelPlan`/`handleUpgrade` son TODOs vacíos | 2-3 días (Stripe Customer Portal) |
| `dashboard/auditoria-legal` | **Broken** | Llama a `/api/legal-audit`, endpoint inexistente → error garantizado | 1 día (reusar patrón de `tools/analisis`) o esconder página (1h) |
| `dashboard/generar-escritos` | **Mocked** | `generateMockDocument()` devuelve texto plantilla fijo, sin OpenAI ni Firestore | 1 día (reusar patrón de `tools/generacion`) o esconder |
| `dashboard/repositorio` | **Stub** | UI de explorador de archivos con datos hardcodeados, no conectado a Storage | 1 día (reusar `storage-client.ts` de `/documents`) |
| `dashboard/administrador` | **Partial** | `isAdmin` check real, pero usa "Mock sync status" y mock email gen en modo static export | 2-3 días |
| Rutas legacy duplicadas: `dashboard/casos`, `crear-caso`, `directorio-clientes`, `casos-a-tiempo/urgentes/vencidos`, `estudiantes`, `analisis-caso` | **Stub/Partial** | Coexisten con `/cases`, `/clients` nuevos; navegación confusa, superficie de QA innecesaria | 2-3 días de limpieza |
| Document AI (`@google-cloud/documentai`) | **Configurado, sin uso** | Importado solo en ruta `.disabled`; requiere `DOCUMENT_AI_PROCESSOR_ID`/`LOCATION`/`GCLOUD_PROJECT` no configurados | Eliminar dependencia (1h) o activar extracción real (3-5 días) |
| Google Chat notifications | **Configurado, sin uso** | Funciones referenciadas pero sin invocaciones activas | Bajo |
| `firestore.rules` | **Broken (crítico)** | Catch-all `allow read, write: if request.auth != null` anula todas las reglas de ownership de arriba | Horas |
| `storage.rules` | **Done** | Ownership por `request.auth.uid == userId` correcto en todos los paths | — |
| `firestore.indexes.json` | **Done** | Coincide con lo declarado en CLAUDE.md | — |
| Despliegue (Firebase Hosting SSR + Cloud Functions) | **Done, no verificado en vivo** | Última evidencia de deploy exitoso: 30 abr 2026 (~6 semanas). Cloud Functions v2 corren sobre Cloud Run, que requiere billing activo — confirmar que sigue habilitado | Smoke test (~1h) |

---

## 2. Top blockers, priorizados por impacto

1. **[CRÍTICO — Seguridad] Regla catch-all en `firestore.rules`** (líneas 35-37: `match /{document=**} { allow read, write: if request.auth != null; }`). Cualquier usuario logueado puede leer/escribir `cases`, `clients`, `conversations`, `purchases`, `users` de cualquier otro usuario, pese a que esas colecciones (o sus equivalentes en `storage.rules`) tienen reglas de ownership específicas más arriba que esta regla anula. **Esto es el #1 a corregir antes de cualquier crecimiento de usuarios reales.** Esfuerzo: horas — escribir reglas explícitas por colección (`cases`, `clients`, `conversations`, `purchases`, `documents`, `users`) siguiendo el mismo patrón ya correcto de `storage.rules`, y terminar con `allow read, write: if false;`.

2. **`dashboard/auditoria-legal` está roto** — llama a `/api/legal-audit`, que no existe. Cualquier usuario (y la página de marketing `productos/gestion-abogados` la menciona como feature de "auditorías") que la use obtiene un error. Es una promesa de marketing sin backend.

3. **`dashboard/generar-escritos` es 100% mock** — `generateMockDocument()` devuelve una plantilla de texto fija ("Señor Juez...[NÚMERO]..."), sin llamar a OpenAI ni guardar nada. Si esta página es alcanzable desde el dashboard de Abogados, un usuario de pago recibe un documento falso.

4. **Gestión de suscripción inexistente** — `/subscription` muestra los planes pero `handleCancelPlan` y `handleUpgrade` son TODOs vacíos. Un suscriptor de pago no tiene forma de cambiar o cancelar su plan desde la app.

5. **Brecha de producto en el "Agente IA"** — el prompt de Abogados (`src/lib/agent-prompts.ts`) promete "buscar jurisprudencia", "gestionar casos" y conversión automática a Word/PDF en backend; la implementación real (`/api/agent/route.ts`) es un chat GPT-4o puramente conversacional, sin function-calling, sin persistencia de conversación en Firestore, sin rate limiting. El componente `ToolCallBadge.tsx` existe pero no se alimenta de tool-calls reales. Esto es tanto un riesgo de expectativas del cliente como un riesgo de costo (sin límites de uso).

6. **`dashboard/repositorio` es una UI con datos falsos** — explorador de archivos con estructura, versiones y búsqueda hardcodeadas, no conectado a Firebase Storage, mientras que `/documents` (la versión nueva) sí lo está y podría reutilizarse.

7. **Webhook de Stripe sin retry/timeout** — `stripeWebhook` responde `{received:true}` y genera el documento en background sin await; si la generación tarda más que el timeout de la función o falla, no hay reintento ni cola de errores → riesgo de "cliente pagó, nunca recibió el documento".

8. **Duplicación de rutas legacy vs nuevas** — `/dashboard/casos`, `/dashboard/crear-caso`, `/dashboard/directorio-clientes`, `/dashboard/casos-a-tiempo|urgentes|vencidos`, `/dashboard/estudiantes`, `/dashboard/analisis-caso` coexisten con `/cases`, `/clients`, `/dashboard` nuevos. Aumenta la superficie de QA y puede confundir a usuarios que lleguen por links antiguos o bookmarks.

9. **Verificación operativa pendiente del proyecto GCP** — `SITUATION_ASSESSMENT.md` (feb 2026) y `docs/habilitar-billing-cloud-run.md` documentan problemas históricos de billing en `avocat-legaltech-v3`. `CLAUDE.md` (30 abr 2026) y `DEPLOY_SUMMARY.md` indican que el deploy a Firebase Hosting + Cloud Functions fue exitoso después de eso, pero han pasado ~6 semanas sin commits relacionados a infraestructura. Como **todo** el motor de pagos/documentos legacy depende de Cloud Functions v2 (que corren sobre Cloud Run, y requieren billing activo), conviene un smoke test en producción antes de confiar en él para una campaña.

10. **Dato hardcodeado en Reclamación** — `ReclamacionProcessSimple.tsx:64` tiene `nombreTrabajador: 'María García López'` con un TODO de "obtener del formulario o perfil". Cualquier reclamación generada hoy probablemente incluye este nombre falso en el documento legal real entregado al cliente — esto es más grave que un simple TODO porque afecta el *output* que recibe el cliente que pagó.

---

## 3. Secuencia recomendada

### Quick wins (1-3 días, alto impacto / bajo esfuerzo)
- **Corregir `firestore.rules`** — reemplazar el catch-all por reglas explícitas por colección (mismo patrón que `storage.rules`). Es lo más importante de todo el informe.
- **Arreglar el dato hardcodeado en `ReclamacionProcessSimple.tsx:64`** — afecta documentos reales entregados a clientes pagantes hoy.
- **Esconder o arreglar `dashboard/auditoria-legal`** — al menos quitarla de navegación/marketing hasta tener backend; idealmente reusar el patrón de `/api/tools/analisis` (mismo modelo, mismo formato JSON).
- **Eliminar `/dev/stripe-reclamacion-test`** — página de desarrollo que llama a una ruta `.disabled`, no debería existir en `main`.
- **Decidir el destino de `dashboard/generar-escritos`**: o se esconde, o se reimplementa copiando el patrón ya funcional de `(app)/tools/generacion` (llamada a `/api/agent` + descarga Word/PDF), que ya existe y funciona.

### Corto plazo (1-2 semanas)
- **Conectar `dashboard/repositorio` a Storage real** reutilizando `storage-client.ts` / la lógica de `(app)/documents`.
- **Implementar gestión de suscripción** vía Stripe Customer Portal (1 llamada a la API de Stripe + redirect) para reemplazar los TODOs de `/subscription`.
- **Rate limiting + manejo de errores en `/api/agent` y rutas OpenAI** — traducir errores de OpenAI (rate limit, context length, auth) a respuestas útiles, añadir logging de `usage` para control de costos.
- **Smoke test end-to-end en producción**: signup con plan de pago → checkout (Cloud Function) → webhook → Firestore → generación de documento → descarga. Esto valida simultáneamente el estado de billing de GCP y el pipeline de pagos completo.
- **Resolver la brecha de "agente"**: o se implementa tool-calling mínimo (búsqueda de casos del usuario, lookup de documentos del caso — ya hay contexto de caso cargado), o se ajusta el copy del prompt/marketing para no prometer jurisprudencia/gestión de casos que no existen.

### Estructural (más largo plazo)
- **Consolidar las dos generaciones de producto**: documentar explícitamente qué rutas legacy (`/dashboard/casos`, `crear-caso`, `directorio-clientes`, `casos-*`, `estudiantes`, `analisis-caso`, `administrador`) se retiran vs se migran a `(app)/*`, y eliminar las que sobren.
- **Document AI**: decidir entre eliminar la dependencia `@google-cloud/documentai` (reduce superficie/riesgo) o terminar de cablear `extraccion-datos` con OCR real.
- **Persistencia de conversaciones del agente** en Firestore si la memoria multi-turno es parte de la promesa de producto (lo prometen `CHATBOT_IMPLEMENTATION_ASSESSMENT.md` y los prompts).
- **Limpieza de documentación**: 30+ archivos `.md` de assessments en la raíz del repo (varios contradictorios o desactualizados — p.ej. referencias a Cloud Run/Docker que ya no son el deploy activo). Archivar en `docs/archive/` para reducir ruido a futuros colaboradores (humanos o IA).

---

## 4. Banderas rojas de seguridad y compliance

| Hallazgo | Severidad | Detalle |
|---|---|---|
| `firestore.rules` catch-all (`{document=**}` → `if request.auth != null`) | **Crítico** | Anula el aislamiento por `userId` de `cases`, `clients`, `conversations`, `purchases`, `users`, etc. Cualquier usuario autenticado puede leer/escribir datos de otros usuarios. |
| `storage.rules` | OK | Todos los paths exigen `request.auth.uid == userId`; regla final `allow read, write: if false`. Sin problemas. |
| `env.local` con clave Stripe `sk_live_...` en disco local | Bajo (higiene) | **Verificado: nunca estuvo en el historial de git de `main`**, y Next.js no lo carga (solo `.env.local`, que tiene claves `sk_test_`/`pk_test_`). Es un archivo huérfano sin uso — recomendable borrarlo o moverlo a un gestor de secretos, pero no es una fuga. |
| Dos convenciones de env files (`.env.local` vs `env.local`, `.env.example` vs `env.example`) | Medio | Confuso para onboarding de devs; `env.example` tiene claves (`GOOGLE_CHAT_WEBHOOK_URL`, `NEXTAUTH_*`, `OPENAI_MOCK/MODEL`, `STRIPE_RECLAMACION_UNIT_AMOUNT`) que `.env.example` no tiene. Consolidar a un solo par `.env.example`/`.env.local`. |
| Firebase Web API Key hardcodeada en `src/lib/firebase.ts:9` | Bajo | Las API keys de Firebase Web son públicas por diseño, pero por consistencia debería leerse de `NEXT_PUBLIC_FIREBASE_API_KEY` como el resto de config. |
| Páginas legales (`terminos`, `privacidad`, `cookies`, `gdpr`) | OK | Texto completo y profesional en español, sin placeholders. Listas para producción. |
| Webhook Stripe sin retry/DLQ | Medio | Riesgo operacional/legal: clientes que pagan y no reciben su documento, sin mecanismo automático de recuperación. |
| `dashboard/administrador` con "Mock sync status" / mock email gen | Medio | Si el admin usa estos datos para decisiones operativas, son falsos en modo static export. |

---

## 5. Notas por área (referencia rápida)

**Superficies de usuario y roles** — 3 planes (`Abogados`/`Estudiantes`/`Autoservicio`) definidos en `src/lib/auth.ts`, guard en `AppShellClient.tsx`. Marketing y páginas legales: completas. Páginas `(app)/*` (cases, clients, documents, tools, agent): reales y conectadas a Firestore/Storage. Dashboard Abogados: real con KPIs de Firestore.

**Pagos** — El webhook real vive en `functions/src/index.ts` (`stripeWebhook`, export en línea ~3989), con verificación de firma, manejo de raw body y soporte para `accion_tutela`/`reclamacion_cantidades`/`estudiantes`. El checkout (`createCheckoutSession`, Cloud Function en línea ~1686) es invocado vía `src/lib/api-endpoints.ts::getCheckoutSessionEndpoint()`, que en producción (`avocatapp.com`/`*.web.app`) usa la URL de Cloud Function directamente — usado por `SignupForm.tsx`, `TutelaProcessSimple.tsx`, `ReclamacionProcessSimple.tsx`, `dashboard/estudiantes`. Las rutas Next.js `.disabled` son legado intencional, no rutas rotas activas (excepto la página `/dev`).

**Servicios legales** — Tutela y Reclamación: flujo completo pago→webhook→Firestore (`purchases`, `reclamaciones`)→PDF/DOCX→historial, verificado contra `ACCION_TUTELA_FIRESTORE_IMPLEMENTATION.md` e `IMPLEMENTATION_SUMMARY.md`. Auditoría Legal y Generar Escritos: no funcionales (ver blockers #2 y #3). Extracción de Datos y Revisión de Email: parcialmente funcionales vía `/api/agent` genérico, con persistencia inconsistente.

**Agente/IA** — `/api/agent` usa GPT-4o, streaming real, `max_tokens: 4000`, extracción de adjuntos PDF/DOCX/XLSX/imagen funcional (pdf-parse, mammoth, xlsx, vision). Sin tool-calling, sin rate limiting, sin persistencia de historial. `@google-cloud/documentai` instalado pero no invocado desde código activo.

**Infraestructura** — Deploy activo: Firebase Hosting (web frameworks/SSR) + Cloud Functions v2, proyecto `avocat-legaltech-v3`, confirmado por `firebase.json`, `next.config.js` y commits recientes. Dockerfile/server.js/deploy-cloud-run.sh son legado, sin commits recientes. `firestore.indexes.json` coincide con lo documentado. Última evidencia de deploy exitoso: 30 abr 2026 — recomendable smoke test antes de campaña.

---

*Auditoría generada por Claude Code — read-only, sin modificaciones a la base de código.*
