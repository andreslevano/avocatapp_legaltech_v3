# Precios v4 — informe de implementación

Rama `feat/precios-v4` (desde `dev`, sin push). Catálogo único: `src/lib/pricing.ts`.

## 1. Lo que hay que decidir antes de publicar

1. **El envío de firma extra (20 créditos) se vende por debajo de su coste (2 € Yousign, POR CONFIRMAR) en 18 de 20 combinaciones plan × país.** Ver §6. Propuesta: cobrar el envío extra según el plan (p. ej. 40 créditos en Empresa) o en dinero fijo por país.
2. **El precio por crédito no baja en todos los pasos (D1).** Estudiante es el plan más barato por crédito en todos los países (0,41–0,61× Abogado). El test comprueba Particular > Abogado > Inicial > Negocio y que el pack es el más caro; Estudiante queda como excepción documentada. Alternativa: Estudiante con 40 créditos.
3. **Planes anuales:** el webhook concede los 12 meses de créditos de una vez (Stripe solo cobra una vez al año). Si se quiere mensual, hace falta una tarea programada.
4. **Acumulación de créditos:** hoy se suman (no se reinician cada mes). La FAQ dice «se renuevan cada mes». Pendiente de decisión.

## 2. Pasos (commits)

| Commit | Paso |
|---|---|
| `feat(pricing): Precios v4 catalogue` | B1 catálogo + `plans.ts` derivado; insignias de plan sin precios antiguos |
| `feat(pricing): visitor country and checkout availability` | B2 país (`?pais` → cookie → cabecera geo → Accept-Language → ES) y disponibilidad por env |
| `feat(pricing): pricing components` | B3 `src/components/pricing/*` |
| `feat(pricing): /precios page` | B4 página, JSON-LD, e2e |
| `feat(pricing): waitlist route and server-only billing fields` | B5 `/api/waitlist`, reglas |
| `feat(pricing): home summary, navigation, product pages and contact` | B6 |
| `feat(pricing): /api/checkout with env price ids` | B8 |
| `feat(pricing): signup on the v4 catalogue` | B7 |
| `feat(billing): v4 credit grants in the Stripe webhook (REVIEW BEFORE DEPLOY)` | B9 — **no desplegar sin revisar** |

## 3. Cómo se comporta cada salida

- **Sin ids de Stripe en el entorno** (como en dev): España también muestra «Avísame cuando esté disponible»; Empresa Inicial/Negocio «Solicitar demo»; a Medida «Hablar con ventas».
- **Con ids**: «Probar 14 días gratis» (Abogado, `trial_period_days: 14`), «Empezar» (B2C), «Contratar» (Empresa) → `/signup?plan=…&pais=…&periodo=…` → cuenta → `/api/checkout` → Stripe.
- **Signup `?plan=particular`**: ya no abre el checkout de 50 €/mes; va al plan Particular (si hay id) o entra sin suscripción con los 20 créditos de bienvenida.
- **Firma Avocat**: `SIGNATURE_PROVIDER_LIVE` ≠ `true` → «Próximamente»; `true` → «Disponible» (comprobado con un servidor de dev con la variable a `true`: cabecera y nivel simple en «Disponible», avanzada/cualificada siguen en «Próximamente»).

## 4. Variables de entorno / precios de Stripe a crear

Cada id debe empezar por `price_` (si no, se trata como ausente). Precios B2C con `tax_behavior=inclusive`, B2B con `exclusive`. Suscripciones con `recurring.interval` = `month` (M) o `year` (Y); el pack es un pago único.
Además: `SIGNATURE_PROVIDER_LIVE=false` (por defecto) y opcional `STRIPE_AUTOMATIC_TAX=true` si Stripe Tax está activo.

| Env var | Plan | País | Periodo | Importe | Moneda | Impuesto |
|---|---|---|---|---|---|---|
| `STRIPE_PRICE_ESTUDIANTE_ES_M` | Estudiante | ES | mensual | 6,90 € | EUR | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_ES_Y` | Estudiante | ES | anual | 69 € | EUR | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_ES_M` | Particular | ES | mensual | 9,90 € | EUR | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_ES_Y` | Particular | ES | anual | 99 € | EUR | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ABOGADO_ES_M` | Abogado | ES | mensual | 69 € | EUR | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_ABOGADO_ES_Y` | Abogado | ES | anual | 690 € | EUR | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_ES_M` | Empresa Inicial | ES | mensual | 179 € | EUR | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_ES_Y` | Empresa Inicial | ES | anual | 1.790 € | EUR | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_ES_M` | Empresa Negocio | ES | mensual | 490 € | EUR | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_ES_Y` | Empresa Negocio | ES | anual | 4.900 € | EUR | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_PACK30_ES` | Pack 30 créditos | ES | pago único | 7,90 € | EUR | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_CL_M` | Estudiante | CL | mensual | $4.990 | CLP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_CL_Y` | Estudiante | CL | anual | $49.900 | CLP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_CL_M` | Particular | CL | mensual | $6.990 | CLP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_CL_Y` | Particular | CL | anual | $69.900 | CLP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ABOGADO_CL_M` | Abogado | CL | mensual | $39.990 | CLP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_ABOGADO_CL_Y` | Abogado | CL | anual | $399.900 | CLP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_CL_M` | Empresa Inicial | CL | mensual | $104.990 | CLP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_CL_Y` | Empresa Inicial | CL | anual | $1.049.900 | CLP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_CL_M` | Empresa Negocio | CL | mensual | $289.990 | CLP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_CL_Y` | Empresa Negocio | CL | anual | $2.899.900 | CLP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_PACK30_CL` | Pack 30 créditos | CL | pago único | $4.990 | CLP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_MX_M` | Estudiante | MX | mensual | $99 | MXN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_MX_Y` | Estudiante | MX | anual | $990 | MXN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_MX_M` | Particular | MX | mensual | $149 | MXN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_MX_Y` | Particular | MX | anual | $1,490 | MXN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ABOGADO_MX_M` | Abogado | MX | mensual | $699 | MXN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_ABOGADO_MX_Y` | Abogado | MX | anual | $6,990 | MXN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_MX_M` | Empresa Inicial | MX | mensual | $1,790 | MXN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_MX_Y` | Empresa Inicial | MX | anual | $17,900 | MXN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_MX_M` | Empresa Negocio | MX | mensual | $4,990 | MXN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_MX_Y` | Empresa Negocio | MX | anual | $49,900 | MXN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_PACK30_MX` | Pack 30 créditos | MX | pago único | $99 | MXN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_CO_M` | Estudiante | CO | mensual | $ 14.900 | COP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_CO_Y` | Estudiante | CO | anual | $ 149.000 | COP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_CO_M` | Particular | CO | mensual | $ 24.900 | COP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_CO_Y` | Particular | CO | anual | $ 249.000 | COP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ABOGADO_CO_M` | Abogado | CO | mensual | $ 119.000 | COP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_ABOGADO_CO_Y` | Abogado | CO | anual | $ 1.190.000 | COP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_CO_M` | Empresa Inicial | CO | mensual | $ 309.000 | COP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_CO_Y` | Empresa Inicial | CO | anual | $ 3.090.000 | COP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_CO_M` | Empresa Negocio | CO | mensual | $ 849.000 | COP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_CO_Y` | Empresa Negocio | CO | anual | $ 8.490.000 | COP | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_PACK30_CO` | Pack 30 créditos | CO | pago único | $ 14.900 | COP | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_PE_M` | Estudiante | PE | mensual | S/ 14.90 | PEN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ESTUDIANTE_PE_Y` | Estudiante | PE | anual | S/ 149 | PEN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_PE_M` | Particular | PE | mensual | S/ 24.90 | PEN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_PARTICULAR_PE_Y` | Particular | PE | anual | S/ 249 | PEN | incluido (tax_behavior=inclusive) |
| `STRIPE_PRICE_ABOGADO_PE_M` | Abogado | PE | mensual | S/ 109 | PEN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_ABOGADO_PE_Y` | Abogado | PE | anual | S/ 1,090 | PEN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_PE_M` | Empresa Inicial | PE | mensual | S/ 289 | PEN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_INICIAL_PE_Y` | Empresa Inicial | PE | anual | S/ 2,890 | PEN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_PE_M` | Empresa Negocio | PE | mensual | S/ 779 | PEN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_EMPRESA_NEGOCIO_PE_Y` | Empresa Negocio | PE | anual | S/ 7,790 | PEN | no incluido (tax_behavior=exclusive) |
| `STRIPE_PRICE_PACK30_PE` | Pack 30 créditos | PE | pago único | S/ 14.90 | PEN | incluido (tax_behavior=inclusive) |

## 5. D8 (coste en créditos) frente a lo que cobran hoy las herramientas — sin cambios

| Acción | D8 | Hoy |
|---|---|---|
| Consulta jurídica con citas | 1 | 0 — el agente no consume créditos |
| Generar un documento | 3 | 1 (`/tools/generacion`); NDA y contrato de servicios: 0 |
| Revisar / analizar un documento | 5 | 1 (`/tools/analisis`, `/tools/extraccion-datos`) |
| Investigación profunda | 5 | no existe (Próximamente) |
| Envío a firma (cupo / extra / DocuSign) | 0 / 20 / 0 | DocuSign: 0; Firma Avocat no existe |
| Quién consume | todos los planes | solo `plan === 'Autoservicio'` (`/api/creditos/consumir`); Abogados y Estudiantes ilimitados |

## 6. Margen de la firma (coste Yousign 2 €/envío, POR CONFIRMAR; tipos de cambio supuestos: 1 € = 1.020 CLP = 20 MXN = 4.500 COP = 4 PEN)

| País | Plan | Neto €/mes | Envíos incluidos × 2 € / neto | Envío extra (20 créditos) | |
|---|---|---|---|---|---|
| ES | Particular | 8,18 € | 24 % | 2,73 € | ok |
| ES | Abogado | 69,00 € | 14 % | 2,30 € | ok |
| ES | Empresa Inicial | 179,00 € | 22 % | 1,79 € | **por debajo del coste** |
| ES | Empresa Negocio | 490,00 € | 24 % | 1,23 € | **por debajo del coste** |
| CL | Particular | 5,76 € | 35 % | 1,92 € | **por debajo del coste** |
| CL | Abogado | 39,21 € | 26 % | 1,31 € | **por debajo del coste** |
| CL | Empresa Inicial | 102,93 € | 39 % | 1,03 € | **por debajo del coste** |
| CL | Empresa Negocio | 284,30 € | 42 % | 0,71 € | **por debajo del coste** |
| MX | Particular | 6,42 € | 31 % | 2,14 € | ok |
| MX | Abogado | 34,95 € | 29 % | 1,17 € | **por debajo del coste** |
| MX | Empresa Inicial | 89,50 € | 45 % | 0,90 € | **por debajo del coste** |
| MX | Empresa Negocio | 249,50 € | 48 % | 0,62 € | **por debajo del coste** |
| CO | Particular | 4,65 € | 43 % | 1,55 € | **por debajo del coste** |
| CO | Abogado | 26,44 € | 38 % | 0,88 € | **por debajo del coste** |
| CO | Empresa Inicial | 68,67 € | 58 % | 0,69 € | **por debajo del coste** |
| CO | Empresa Negocio | 188,67 € | 64 % | 0,47 € | **por debajo del coste** |
| PE | Particular | 5,28 € | 38 % | 1,76 € | **por debajo del coste** |
| PE | Abogado | 27,25 € | 37 % | 0,91 € | **por debajo del coste** |
| PE | Empresa Inicial | 72,25 € | 55 % | 0,72 € | **por debajo del coste** |
| PE | Empresa Negocio | 194,75 € | 62 % | 0,49 € | **por debajo del coste** |

Estudiante no tiene firma; Empresa a Medida, por contrato.

## 7. Dónde se lee el plan

- `planTier` (nuevo) lo leen/escriben: `functions/src/credit-grants.ts` + `functions/src/index.ts` (webhook, escritura), `src/lib/checkout.ts` (metadata), `src/lib/pricing.ts`, `firestore.rules` (solo servidor). Ninguna pantalla lo usa todavía: los suscriptores Empresa guardan `plan: 'Abogados'`, así que todas las comprobaciones `plan === 'Abogados'` les dan acceso profesional sin cambios.
- `plan` (sin cambios de valores) se lee en estos archivos:

  - `firestore.rules`
  - `functions/src/credit-grants.ts`
  - `functions/src/index.ts`
  - `src/app/(app)/agent/page.tsx`
  - `src/app/(app)/cases/[id]/page.tsx`
  - `src/app/(app)/cases/new/page.tsx`
  - `src/app/(app)/documents/page.tsx`
  - `src/app/(app)/legal-changes/page.tsx`
  - `src/app/(app)/notifications/page.tsx`
  - `src/app/(app)/panel/page.tsx`
  - `src/app/(app)/settings/perfil/page.tsx`
  - `src/app/(app)/settings/suscripcion/page.tsx`
  - `src/app/(app)/tools/analisis/page.tsx`
  - `src/app/(app)/tools/contrato-servicios/page.tsx`
  - `src/app/(app)/tools/estudiantes/page.tsx`
  - `src/app/(app)/tools/extraccion-datos/page.tsx`
  - `src/app/(app)/tools/generacion/page.tsx`
  - `src/app/(app)/tools/nda/page.tsx`
  - `src/app/(app)/tools/page.tsx`
  - `src/app/(app)/tools/revision-email/page.tsx`
  - `src/app/(public)/onboarding/page.tsx`
  - `src/app/api/agent-v2/route.ts`
  - `src/app/api/creditos/consumir/route.ts`
  - `src/app/api/checkout/route.ts`
  - `src/app/api/folders/[id]/delete/route.ts`
  - `src/components/agent/AgentChat.tsx`
  - `src/components/agent/AgentV2Chat.tsx`
  - `src/components/agent/AgentWelcome.tsx`
  - `src/components/auth/LoginForm.tsx`
  - `src/components/auth/SignupForm.tsx`
  - `src/components/documents/FolderDialogs.tsx`
  - `src/components/integrations/ConnectDocusignCard.tsx`
  - `src/components/integrations/ImportOptionsSheet.tsx`
  - `src/components/landing/PricingSection.tsx`
  - `src/components/layout/AppShellClient.tsx`
  - `src/components/layout/PreviewVerifyBanner.tsx`
  - `src/components/layout/Rail.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/UserProfilePanel.tsx`
  - `src/components/notifications/NotificationBell.tsx`
  - `src/components/signatures/SignAndSendButton.tsx`
  - `src/components/signatures/SignatureNotifier.tsx`
  - `src/contexts/DocumentsWorkspaceContext.tsx`
  - `src/contexts/ImportJobsContext.tsx`
  - `src/lib/auth.ts`
  - `src/lib/contracts/config.ts`
  - `src/lib/contracts/route-helpers.ts`
  - `src/lib/contracts/server-alerts.ts`
  - `src/lib/checkout.ts`
  - `src/lib/docusign/config.ts`
  - `src/lib/folders/types.ts`
  - `src/lib/google-auth.ts`
  - `src/lib/integrations/microsoft/config.ts`
  - `src/lib/legal/server.ts`
  - `src/lib/pdf/email-generator.ts`
  - `src/lib/plans.ts`
  - `src/lib/pricing.ts`
  - `src/lib/prompts/email-fidelizacion.ts`
  - `src/lib/signatures/server.ts`
  - `src/lib/storage.ts`
  - `src/lib/waitlist.ts`

## 8. TODO abiertos

- Precio del miembro extra por encima del máximo (deck: +59 € / +49 €): no se imprime; se muestra «Pasa a Negocio / Hablar con ventas».
- Acumulación de créditos del plan (ver §1.4) y caducidad.
- Redacción de reembolsos (legal).
- Validez de la firma por país (revisión del abogado chileno).
- Verificación del email universitario de Estudiante: método por decidir (hoy no se verifica; el plan se elige en el registro).
- Onboarding de usuarios existentes (Google / migración): país fijo España para mostrar precios; no ofrece Empresa.
- Tipos de cambio y coste real de Yousign para §6.
- Lighthouse y axe no están instalados en el repo: accesibilidad comprobada con roles/etiquetas en e2e, no con puntuación.
- Las pruebas de reglas (`npm run test:rules`) no se han podido ejecutar: requieren JDK 21 (en esta máquina hay 17).

## 9. Capturas

`screenshots/precios/` (no se versiona): `es-375.png`, `es-768.png`, `es-1280.png`, `cl-375.png`, `cl-768.png`, `cl-1280.png`, `comparar-1280.png`. Se regeneran con `npx playwright test tests/e2e/precios.e2e.spec.ts`.

## 10. Despliegue

1. Crear en Stripe los precios de §4 (al menos los de España) y añadir sus ids a `.env.local` / entorno de Cloud Run. **Sin ids de España, el plan Abogado no se puede contratar desde /precios** (sale «Avísame») y el enlace «Probar 14 días gratis» del menú crea la cuenta sin suscripción.
2. Instalar JDK 21 y ejecutar `npm run test:rules`.
3. Reglas: `firebase deploy --only firestore:rules --project avocat-legaltech-v3` (waitlist + campos de facturación solo servidor).
4. Revisar el commit B9 y entonces `firebase deploy --only functions:stripeWebhook --project avocat-legaltech-v3`. Hasta entonces, los packs y los nuevos planes cobrarían sin conceder créditos: no activar sus ids antes del webhook.
5. Hosting: `firebase deploy --only hosting --project avocat-legaltech-v3`.
6. Redirecciones: ninguna obligatoria (`/#precios` sigue existiendo en la home; el menú apunta a `/precios`).
