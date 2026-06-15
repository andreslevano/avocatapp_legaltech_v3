# Avocat — Strategic Roadmap (Market Readiness → Differentiation)
**Fecha:** 13 jun 2026 | **Tipo:** Roadmap estratégico, sin cambios de código aplicados

---

## Cómo leer este documento

Tres fases que se solapan parcialmente:

- **Fase 0 — Estabilización** (1-3 semanas): los 18 items del audit. Hace que lo prometido hoy = lo que existe hoy.
- **Fase 1 — Consolidación de oferta** (2-4 semanas): resuelve los modelos de pricing/plan mixtos (Autoservicio, Estudiantes) y alinea marketing con producto.
- **Fase 2 — Diferenciación con IA** (6-12 semanas, puede arrancar en paralelo a Fase 1): Claude API para el nuevo core del agente + RAG España → Chile.

Fase 0 es bloqueante para campañas. Fase 1 es bloqueante para que el pricing tenga sentido. Fase 2 es la apuesta de producto a medio plazo.

---

## FASE 0 — Estabilización (items 2-18 del audit)

| # | Item | Esfuerzo | Depende de |
|---|---|---|---|
| 1 | ✅ `firestore.rules` catch-all — **hecho** | — | — |
| 2 | Fix nombre hardcodeado `ReclamacionProcessSimple.tsx:64` | horas | — |
| 3 | Esconder/arreglar `dashboard/auditoria-legal` | 1h–1d | — |
| 4 | Eliminar `/dev/stripe-reclamacion-test` | minutos | — |
| 5 | Decidir destino de `dashboard/generar-escritos` | 1d | — |
| 6 | Conectar `dashboard/repositorio` a Storage real | 1d | — |
| 7 | Gestión de suscripción (Stripe Customer Portal) | 2-3d | **Decisión de pricing (Fase 1)** — implementar después de decidir el modelo de Autoservicio, para no construir sobre un modelo que cambia |
| 8 | Rate limiting + manejo de errores `/api/agent` | 2-3d | — |
| 9 | Smoke test E2E en producción (valida billing GCP) | ~1h | — |
| 10 | Cierre de brecha del "agente" | — | **Se resuelve en Fase 2**, no aquí — ver nota abajo |
| 11 | Consolidar rutas legacy vs nuevas | 2-3d | Depende de decisión Estudiantes (Fase 1) para `/dashboard/estudiantes` |
| 12 | Decidir Document AI | 1h–5d | Depende de si Fase 2 RAG necesita OCR (probablemente sí para jurisprudencia escaneada) |
| 13 | Persistencia de conversaciones del agente | — | Si Fase 2 migra a Claude, conviene implementar esto **una sola vez** sobre el nuevo core, no dos veces |
| 14 | Retry/DLQ en webhook Stripe | 2-3d | — |
| 15 | Archivar `.md` de assessments | bajo | — |
| 16-18 | Hygiene (env files, API key, archivo huérfano) | bajo | — |

**Reordenamiento recomendado dentro de Fase 0:**
- **Ahora (días 1-3):** #2, #3, #4, #5, #9, #15-18 — todo lo que no depende de decisiones de producto.
- **Después de decisión Estudiantes/Autoservicio (Fase 1):** #7, #11
- **Diferido a Fase 2:** #10, #12, #13 (evitar doble trabajo)
- **En paralelo, cuando convenga:** #6, #8, #14

---

## FASE 1 — Consolidación de oferta (2-4 semanas)

Objetivo: que cada plan tenga **un solo** flujo, un solo modelo de pricing, y que marketing describa exactamente eso.

### 1.1 Plan Abogados (€75/mes)
- Cambio de copy: "50+ tipos de escritos" → "generación ilimitada de escritos mediante IA". Sin cambio de código.
- Sin decisiones pendientes de producto — el flujo actual ya es coherente.

### 1.2 Plan Estudiantes (€3/escrito)
- **Decisión requerida:** ¿cuál de los dos sistemas es el canónico?
  - Opción A: legacy `/dashboard/estudiantes` (cart 8×7, ya tiene historial de compras) — restyle dentro de `(app)/*`.
  - Opción B: extender `/tools` a las 56 combinaciones.
- Tras decidir, implementar "portfolio académico" (filtro de `/documents` por área).

### 1.3 Plan Autoservicio (€50/mes)
- **Decisión requerida:** modelo de pricing.
  - Opción A (recomendada): €50/mes = acceso ilimitado a `/agent` (asistente lenguaje llano) + `/tools` de análisis/extracción. Tutela y Reclamación quedan como compras únicas separadas, con precio propio.
  - Opción B: implementar sistema real de créditos/uso para sostener "100 créditos/mes" — esfuerzo mayor, nueva infraestructura de medición.
- Tras decidir: actualizar copy de marketing, e implementar #7 (gestión de suscripción) sobre el modelo elegido.

### 1.4 Plan Solo Escritos (€10/doc)
- **Decisión requerida:** ¿se mantiene como plan independiente, se absorbe en Autoservicio como "compra puntual", o se elimina? Actualmente no aparece en el mapeo de features — aclarar si es un Payment Link huérfano.

---

## FASE 2 — Diferenciación con IA (6-12 semanas, arranca en paralelo)

### 2.1 Quality A/B — generación de documentos (1-2 semanas)
- Comparar Claude Sonnet 4.6 vs GPT-4o en 5-10 tipos de escritos reales (tutela, demanda, reclamación, derecho de petición).
- Evaluación por abogado(s) reales sobre: precisión jurídica, tono formal, formato, consistencia en español jurídico ES/LatAm.
- **Output de esta etapa:** decisión go/no-go sobre qué modelo usar para generación.

### 2.2 Nuevo core del agente — tool-calling mínimo (3-4 semanas)
- Construir el nuevo agente sobre **Claude API** (greenfield, sin migrar el flujo GPT-4o existente todavía).
- Tools iniciales (sin RAG aún): búsqueda de casos del usuario, lookup de documentos del caso (contexto ya se carga, falta exponerlo como tool).
- Implementar persistencia de conversaciones en Firestore (resuelve item #13) **una sola vez** sobre este nuevo core.
- Resuelve item #10 del audit de forma estructural.

### 2.3 RAG — Fase España (4-6 semanas, puede solaparse con 2.2)
- Pipeline de ingestión: BOE (legislación) + CENDOJ (jurisprudencia TS/AP) + Códigos (Civil, Penal, LEC).
- Embeddings: Vertex AI `text-embedding-005` (GCP-nativo, ver costos abajo) — evaluar calidad vs Voyage `voyage-law-2` si el presupuesto lo permite, pero no es bloqueante.
- Vector store: **Firestore Vector Search** (`findNearest`, ya disponible en Firestore — sin infraestructura nueva, respeta la restricción GCP/Firebase).
- Tool `buscar_normativa_jurisprudencia(query, jurisdiction='ES')` integrado al agente de 2.2.
- UI de citas — activa `ToolCallBadge.tsx` (actualmente sin uso) con tool-calls reales.
- Scope inicial: civil/laboral/contractual (tipos de caso ya soportados).

### 2.4 RAG — Fase Chile (3-4 semanas, tras validar España)
- Misma arquitectura, fuentes: BCN/leychile.cl (legislación) + Poder Judicial (jurisprudencia).
- Valida el diseño multi-jurisdicción y habilita expansión LatAm (alineado con persona "Iberoamericana" ya en los prompts).

### 2.5 Migración de extracción/análisis (paralelo, baja prioridad)
- Decidir Document AI (#12) en función de si 2.3/2.4 requieren OCR para jurisprudencia escaneada.

### 2.6 RAG privado — repositorio del despacho (3-4 semanas, tras validar 2.3)
- **Qué es:** complementa la RAG de jurisprudencia (externa/pública) con una RAG sobre los **documentos propios del despacho** — casos anteriores, contratos, escritos, plantillas ya subidos a `/documents`. Da al agente acceso al estilo, precedentes y conocimiento propio de cada abogado/despacho, no solo al marco legal general.
- **Por qué importa:** es probablemente el diferenciador de mayor "pegajosidad" para el plan Abogados (€75/mes) — el valor crece con el uso (más documentos subidos = agente más útil), y es difícil de replicar por competidores genéricos.
- **Arquitectura:** misma base que 2.3 (Firestore Vector Search + Vertex AI embeddings), pero:
  - Embeddings generados **al subir/generar** cada documento en `/documents` (hook en `storage-client.ts`).
  - **Aislamiento estricto por `userId`** — cada vector lleva `userId` como metadata obligatoria, y las queries del agente SIEMPRE filtran por el `userId` de la sesión. Reutiliza el mismo patrón de ownership ya validado en `firestore.rules`.
  - Nuevo tool `buscar_documentos_propios(query)` — el agente decide cuándo usar este tool vs. `buscar_normativa_jurisprudencia` (jurisprudencia pública) según el tipo de pregunta.
- **Costos (incremental sobre 2.3, GCP/Firebase):**
  - Embeddings: generados de forma incremental por documento subido (no hay carga masiva inicial) — costo marginal por documento, prácticamente cero (céntimos por cada cientos de documentos).
  - Almacenamiento: escala con el volumen total de documentos de usuarios — sigue siendo bajo (Firestore ~€0,16/GB/mes).
  - Tokens LLM adicionales: mismo orden que 2.3 (~2.500 tokens extra por consulta que use este tool).
  - **Sin costo de fuentes de datos** (a diferencia de jurisprudencia, los documentos ya son del cliente — no hay licencias).
- **Esfuerzo:** ~3-4 semanas — reutiliza pipeline de 2.3, principal trabajo nuevo es el hook de embedding al subir documento + lógica de selección de tool + tests de aislamiento por usuario (crítico dado el historial de la regla catch-all).
- **Secuencia recomendada:** después de 2.3 (España), en paralelo con 2.4 (Chile) si hay capacidad — no depende de jurisdicción, es transversal a ambas.

---

## DECISIONES RECIBIDAS (13 jun 2026)

| # | Decisión | Resuelto a | Implicación para el roadmap |
|---|---|---|---|
| 1 | Estudiantes | **Extender `/tools` a las 56 combinaciones (8 áreas × 7 tipos)** | Fase 1.2 pasa de "restyle" a desarrollo real: portar la matriz 8×7 y su lógica de generación al patrón `/tools/generacion`. Esfuerzo sube de ~días a **1-2 semanas**. Tras esto, retirar `/dashboard/estudiantes` legacy (alimenta item #11). |
| 2 | Autoservicio | **Sistema de créditos real** | Pasa de "Opción A" (bajo esfuerzo) a **Opción B**: requiere modelar `creditos_disponibles`/`creditos_consumidos` en `users/{uid}`, lógica de consumo por acción (chat, análisis, generación, extracción), y actualizar Stripe para asignar 100 créditos/mes en el ciclo de facturación. Esfuerzo estimado: **1.5-2 semanas**, debe completarse **antes** de #7 (gestión de suscripción), ya que el portal de suscripción debe reflejar saldo de créditos. |
| 3 | Solo Escritos €10/doc | **Mantener, plegado dentro de Autoservicio** como compra puntual (top-up de créditos o documento fuera del pool) | Se convierte en una opción de "comprar créditos adicionales" o "documento puntual €10" dentro del flujo de Autoservicio — reutiliza el checkout de Stripe ya existente. Bajo esfuerzo una vez exista el sistema de créditos (#2). |
| 4 | LLM / Claude API | **Go-ahead confirmado** | Fase 2.1 (A/B) y 2.2 (nuevo core del agente) pueden iniciar en cuanto se provea la API key de Anthropic. |
| — | Infraestructura | **Debe permanecer en GCP/Firebase** | Define el vector store de Fase 2.3/2.4 → **Firestore Vector Search** (ya reflejado arriba). Descarta Pinecone/Weaviate/Cloud SQL+pgvector como opciones primarias. |

### Impacto en la secuencia de Fase 1
Con estas decisiones, Fase 1 ya no es "consolidación ligera" — tiene dos streams de desarrollo real:
- **Stream A (Estudiantes):** portar matriz 8×7 a `/tools` — 1-2 semanas.
- **Stream B (Autoservicio):** sistema de créditos + Stripe + Solo Escritos como top-up — 1.5-2 semanas, y **bloquea #7** (gestión de suscripción debe construirse sobre el sistema de créditos, no antes).

Estimación revisada de Fase 1: **3-4 semanas** (los dos streams pueden ir en paralelo si hay capacidad de dos desarrolladores; si es uno solo, son secuenciales → ~4 semanas).

---

## APÉNDICE — Estimación de costos RAG (España y Chile, GCP/Firebase)

Con la restricción de permanecer en GCP/Firebase, la arquitectura usa **Firestore Vector Search** + **Vertex AI Embeddings**, evitando infraestructura nueva. Los costos de infraestructura son bajos; el costo dominante es el **trabajo de ingeniería** y, potencialmente, el **acceso a bases de datos jurídicas de pago**.

### 1. Costos de infraestructura (recurrentes, GCP)

| Componente | Estimación de volumen (MVP España) | Costo estimado |
|---|---|---|
| **Embeddings (ingesta inicial)** | ~10.000-15.000 chunks (Códigos Civil/Penal/LEC + jurisprudencia curada CENDOJ) × ~500 tokens | Vertex AI `text-embedding-005`: orden de **€5-15 una sola vez** |
| **Almacenamiento Firestore (vectores + metadata + texto)** | ~15.000 docs × ~6KB | **<€0,05/mes** (almacenamiento Firestore es ~€0,16/GB/mes) |
| **Lecturas Firestore por búsqueda vectorial** | Cada consulta del agente = ~5 lecturas (top-k). A 10.000 consultas/mes = 50.000 lecturas | **<€0,05/mes** |
| **Embeddings de consultas en tiempo real** | 1 embedding por consulta de usuario | Negligible (<€1/mes a volumen MVP) |
| **Tokens adicionales al LLM por contexto recuperado** | ~5 chunks × ~500 tokens = 2.500 tokens extra por consulta, a 10.000 consultas/mes = 25M tokens | Con Claude Sonnet (~$3/M tokens input): **~€60-75/mes** — este es el costo recurrente más relevante, y escala linealmente con uso |

**Total infraestructura recurrente (MVP, España):** del orden de **€60-100/mes**, dominado por el consumo adicional de tokens del LLM, no por el vector store en sí. Escala con el número de consultas reales de usuarios — conviene monitorear vía logging de `usage` (ya recomendado en item #8).

### 2. Costo de fuentes de datos — el factor variable más importante

| Fuente | Tipo | Costo |
|---|---|---|
| BOE (legislación española) | Open data / API pública | **€0** |
| Códigos (Civil, Penal, LEC) | Texto público | **€0** |
| CENDOJ (jurisprudencia TS/AP) | Búsqueda pública limitada, sin API de bulk/export oficial | **€0**, pero **esfuerzo de scraping/extracción manual** — cobertura limitada frente a bases de pago |
| BCN / leychile.cl (Chile) | Open data / API pública | **€0** |
| Poder Judicial Chile | Acceso público a sentencias | **€0**, similar limitación de bulk export |
| **Alternativa — bases jurídicas de pago** (vLex, Aranzadi, Tirant) | Suscripción API/bulk | **Variable, típicamente cientos a miles de €/mes** según volumen — ofrecen jurisprudencia mucho más completa e indexada |

**Recomendación:** arrancar con fuentes gratuitas (BOE/Códigos + CENDOJ acotado a civil/laboral/contractual) para el MVP de Fase 2.3. Si la calidad de respuestas con jurisprudencia resulta insuficiente, evaluar una suscripción a una base de pago como mejora de Fase 2.3+ — esa decisión se toma **con datos reales de uso**, no de antemano.

### 3. Costo de ingeniería (el componente dominante real)

| Tarea | Esfuerzo |
|---|---|
| Pipeline de ingestión + chunking (BOE/Códigos/CENDOJ) | ~2-3 semanas |
| Integración Firestore Vector Search + embeddings Vertex AI | ~1 semana |
| Tool `buscar_normativa_jurisprudencia` + integración al agente (2.2) | ~1 semana |
| UI de citas (`ToolCallBadge.tsx`) | ~3-5 días |
| **Total Fase 2.3 (España)** | **~4-6 semanas**, como ya estimado |
| **Fase 2.4 (Chile)** — reutiliza pipeline, nuevas fuentes/scrapers | **~2-3 semanas** (reducido de 3-4 por reutilización de arquitectura) |

### 4. Resumen ejecutivo de costos
- **Infraestructura GCP/Firebase:** bajo y predecible — del orden de **€60-100/mes en MVP**, escala con uso real.
- **Fuentes de datos:** **€0** si se arranca con fuentes públicas; el riesgo es cobertura de jurisprudencia limitada. Suscripción a base de pago es la única partida que podría representar un costo significativo (€100s-1000s/mes), y es **opcional y diferible**.
- **Ingeniería:** sigue siendo el costo real del proyecto — ~6-9 semanas combinadas para España + Chile, ya reflejado en el cronograma de Fase 2.

---

*Roadmap generado por Claude Code — sin cambios de código aplicados.*
