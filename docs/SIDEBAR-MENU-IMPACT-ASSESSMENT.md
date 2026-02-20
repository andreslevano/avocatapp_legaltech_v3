# Sidebar Menu Impact Assessment – User Area

**Date:** February 11, 2025  
**Scope:** Authenticated user dashboard – navigation restructure and feature mapping

---

## 1. Executive Summary

This document evaluates the impact of restructuring the user dashboard from the current horizontal tabs to a new sidebar menu. It maps existing features to the target structure, identifies gaps, and proposes actions, tasks, and risks before implementation.

---

## 2. Current State vs. Target State

### 2.1 Current Navigation Structure

| Navigation Item | Path | Used By | Notes |
|----------------|------|---------|-------|
| **Abogados** | `/dashboard` | Lawyers dashboard | Main panel with metrics, LawyerToolbar, CaseStatistics |
| **Estudiantes** | `/dashboard/estudiantes` | Students | Document purchase platform (legal templates) |
| **Reclamación de Cantidades** | `/dashboard/reclamacion-cantidades` | All users | ReclamacionProcessSimple + PurchaseHistory |
| **Acción de Tutela** | `/dashboard/accion-tutela` | All users | TutelaProcessSimple + PurchaseHistory |
| **Administrador** | `/dashboard/administrador` | Admin only | Hidden unless `users/{uid}.isAdmin === true` |

**Additional Abogados routes** (internal, not in main nav):

- `/dashboard/crear-caso` – Create case
- `/dashboard/analisis-caso` – Case analysis (AI document analysis)
- `/dashboard/auditoria-legal` – Legal audit
- `/dashboard/generar-escritos` – Generate writings (templates)
- `/dashboard/directorio-clientes` – Client directory
- `/dashboard/repositorio` – Document repository
- `/dashboard/casos-urgentes`, `/dashboard/casos-a-tiempo`, `/dashboard/casos-vencidos` – Case views

### 2.2 Target Sidebar Structure

```
├── A) Abogados
│   ├── Dashboard
│   ├── Casos
│   └── Clientes
├── B) Estudiantes
└── C) Autoservicio
    ├── Generación de Escritos
    │   ├── Reclamación de cantidades
    │   ├── Acción de tutela
    │   └── Otros
    ├── Análisis de documentos
    ├── Extracción de datos
    └── Revisión de email
```

---

## 3. Feature Mapping: Existing → Target

### 3.1 Abogados Section

| Target Sub-item | Existing Route / Component | Status | Notes |
|-----------------|----------------------------|--------|-------|
| **Dashboard** | `/dashboard` | ✅ Reuse | Main panel with IndicatorCards, LawyerToolbar, CaseStatistics, CustomerStatistics |
| **Casos** | `/dashboard/casos-urgentes`, `/dashboard/casos-a-tiempo`, `/dashboard/casos-vencidos`, `/dashboard/crear-caso`, `/dashboard/analisis-caso` | ⚠️ Aggregate | Need a **Casos hub** page; link to existing case views |
| **Clientes** | `/dashboard/directorio-clientes` | ✅ Reuse | Direct mapping |

### 3.2 Estudiantes Section

| Target Sub-item | Existing Route / Component | Status | Notes |
|-----------------|----------------------------|--------|-------|
| **Estudiantes** | `/dashboard/estudiantes` | ✅ Reuse | Full platform: legal areas, cart, purchases, downloads |

### 3.3 Autoservicio Section

| Target Sub-item | Existing Route / Component | Status | Notes |
|-----------------|----------------------------|--------|-------|
| **Generación de Escritos > Reclamación de cantidades** | `/dashboard/reclamacion-cantidades` | ✅ Reuse | ReclamacionProcessSimple |
| **Generación de Escritos > Acción de tutela** | `/dashboard/accion-tutela` | ✅ Reuse | TutelaProcessSimple |
| **Generación de Escritos > Otros** | `/dashboard/generar-escritos` | ✅ Reuse | Template-based generation (Demanda Civil, Contestación, etc.) |
| **Análisis de documentos** | `/dashboard/analisis-caso` | ⚠️ Partial | Document analysis; may need a dedicated landing or rebrand |
| **Extracción de datos** | OCR in ReclamacionProcessSimple, TutelaProcessSimple, `ocr-analyzer.ts` | ⚠️ Partial | Logic exists; standalone UI needed |
| **Revisión de email** | — | ❌ New | No current implementation |

---

## 4. Gap Analysis

### 4.1 Fully Reusable (No New Work)

- Abogados: Dashboard, Clientes
- Estudiantes: full section
- Autoservicio: Reclamación de cantidades, Acción de tutela, Otros (generar-escritos)

### 4.2 Needs UI Restructuring

- **Casos**: New hub page that aggregates:
  - Create case (`/dashboard/crear-caso`)
  - Case analysis (`/dashboard/analisis-caso`)
  - Urgent / on time / expired links (`/dashboard/casos-urgentes`, etc.)
- **Análisis de documentos**: Either:
  - Reuse `/dashboard/analisis-caso` as Autoservicio > Análisis de documentos, or
  - Create a generic analysis entry point that routes to `analisis-caso` logic

### 4.3 New Features (Proposals)

#### 4.3.1 Extracción de datos

**Proposal:** Standalone document data extraction tool.

- **Backend:** Reuse `ocr-analyzer.ts`, `pdf-ocr.ts`, `storage.ts` (upload, OCR, Firestore).
- **Firestore:** Reuse `uploaded_files` or similar; optional `extracted_data` collection.
- **Flow:** Upload PDF(s) → OCR → Structured extraction (amounts, dates, parties) → Export JSON/CSV.
- **New:** Page `/dashboard/autoservicio/extraccion-datos` with upload + results UI.

#### 4.3.2 Revisión de email

**Proposal:** E-mail review/audit tool.

- **Scope:** Review legal content in emails (e.g., contracts, clauses, deadlines).
- **Backend:** New Cloud Function or API; OpenAI for analysis.
- **Flow:** Paste email or upload .eml → Analysis → Report (risks, suggestions, compliance).
- **Firestore:** Optional `email_reviews` collection.
- **New:** Page `/dashboard/autoservicio/revision-email`, API route, and Cloud Function.

---

## 5. Backend & DB Reuse

### 5.1 Existing Services

| Service | Location | Reusable For |
|---------|----------|--------------|
| Firebase Auth | `lib/firebase.ts` | All |
| Firestore | `lib/firebase.ts` | All |
| Storage | `lib/storage.ts` | Uploads, OCR, extracción |
| OCR | `lib/ocr-analyzer.ts`, `lib/pdf-ocr.ts` | Reclamación, Tutela, Extracción de datos |
| Stripe checkout | Cloud Function `createcheckoutsession` | Estudiantes, Reclamación, Tutela |
| Webhook | Cloud Function | Purchase generation |
| Purchase history | `purchases` collection | Reclamación, Tutela, Estudiantes |

### 5.2 New Services Required

| Feature | New Service | Type |
|---------|-------------|------|
| Extracción de datos | Standalone OCR/extraction API | Cloud Function or API route |
| Revisión de email | Email analysis API | Cloud Function |
| Autoservicio routing | — | Next.js routes only |

---

## 6. Actions & Tasks

### Phase 1: Sidebar & Navigation

| # | Task | Scope | Effort |
|---|------|--------|--------|
| 1.1 | Replace `DashboardNavigation` with new sidebar | `Sidebar.tsx` | Medium |
| 1.2 | Define hierarchical sidebar structure (Abogados, Estudiantes, Autoservicio) | `Sidebar.tsx` | Medium |
| 1.3 | Add collapsible sub-items for Abogados and Autoservicio | `Sidebar.tsx` | Medium |
| 1.4 | Create shared layout wrapper using single sidebar for all dashboard pages | `DashboardLayout` or layout | Medium |
| 1.5 | Standardize all dashboard pages to use shared layout | ~15 pages | Medium |

### Phase 2: Route Restructuring

| # | Task | Scope | Effort |
|---|------|--------|--------|
| 2.1 | Create Casos hub at `/dashboard/casos` | New page | Small |
| 2.2 | Create Autoservicio hub at `/dashboard/autoservicio` | New page | Small |
| 2.3 | Implement sub-routes for Autoservicio: `/dashboard/autoservicio/reclamacion-cantidades`, `/accion-tutela`, `/otros`, `/analisis-documentos`, `/extraccion-datos`, `/revision-email` | Routes | Medium |
| 2.4 | Add redirects from old top-level routes to new structure | `next.config.js` or middleware | Small |

### Phase 3: Feature Proposals (New)

| # | Task | Scope | Effort |
|---|------|--------|--------|
| 3.1 | **Extracción de datos**: New page + reuse OCR services | New page + API | Medium |
| 3.2 | **Revisión de email**: New page + Cloud Function + Firestore schema | Full stack | High |

### Phase 4: Consolidation

| # | Task | Scope | Effort |
|---|------|--------|--------|
| 4.1 | Remove `DashboardNavigation` from individual pages | All dashboard pages | Small |
| 4.2 | Update `LawyerToolbar` and case links to new Casos routes | Components | Small |
| 4.3 | Ensure admin section remains conditional in sidebar | `Sidebar.tsx` | Small |
| 4.4 | i18n updates for new labels | `public/locales/*` | Small |

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing deep links / bookmarks | High | Medium | Add redirects from old paths to new structure |
| Inconsistent layout across dashboard pages | Medium | High | Use single layout wrapper and enforce it |
| Mobile UX degradation with nested sidebar | Medium | Medium | Implement collapsible sections, overlay on mobile |
| “Otros” overlaps with Estudiantes offerings | Low | Low | Clarify: Estudiantes = templates; Otros = custom writings |
| Extracción de datos duplicates logic in Reclamación | Medium | Medium | Reuse `ocr-analyzer` and shared upload flow |
| Revisión de email scope creep | High | Medium | Define MVP (text analysis only) and iterate |
| Admin visibility in sidebar | Low | Low | Keep `isAdmin` check and hide section for non-admins |

---

## 8. Route Mapping Summary

| New Sidebar Path | Target Route | Source |
|------------------|-------------|--------|
| Abogados > Dashboard | `/dashboard` | Existing |
| Abogados > Casos | `/dashboard/casos` | New hub + links to crear-caso, analisis-caso, casos-urgentes, etc. |
| Abogados > Clientes | `/dashboard/directorio-clientes` | Existing |
| Estudiantes | `/dashboard/estudiantes` | Existing |
| Autoservicio > Generación > Reclamación | `/dashboard/autoservicio/reclamacion-cantidades` | Move from `/dashboard/reclamacion-cantidades` |
| Autoservicio > Generación > Tutela | `/dashboard/autoservicio/accion-tutela` | Move from `/dashboard/accion-tutela` |
| Autoservicio > Generación > Otros | `/dashboard/autoservicio/otros` | Move from `/dashboard/generar-escritos` |
| Autoservicio > Análisis de documentos | `/dashboard/autoservicio/analisis-documentos` | Move from `/dashboard/analisis-caso` |
| Autoservicio > Extracción de datos | `/dashboard/autoservicio/extraccion-datos` | **New** |
| Autoservicio > Revisión de email | `/dashboard/autoservicio/revision-email` | **New** |
| Administrador | `/dashboard/administrador` | Existing (conditional) |

---

## 9. Recommendations

1. **Implement Phase 1–2 first** – Sidebar, route structure, and route moves – before adding new features.
2. **Keep old routes working** – Use redirects to avoid breaking links and bookmarks.
3. **Extracción de datos** – Start with a thin UI around existing OCR; extend later.
4. **Revisión de email** – Defer to a later phase; define MVP (e.g. paste text only) to reduce scope.
5. **Test admin visibility** – Ensure Administrador only appears when `isAdmin === true`.

---

## 10. Files to Modify (Summary)

| File | Changes |
|------|---------|
| `src/components/Sidebar.tsx` | Replace flat nav with hierarchical sidebar |
| `src/components/DashboardLayout.tsx` | Ensure it wraps all dashboard content |
| `src/components/DashboardNavigation.tsx` | Remove or deprecate (replace with Sidebar) |
| `src/app/dashboard/page.tsx` | Use shared layout, remove DashboardNavigation |
| `src/app/dashboard/estudiantes/page.tsx` | Use shared layout |
| `src/app/dashboard/reclamacion-cantidades/page.tsx` | Move to autoservicio route, use layout |
| `src/app/dashboard/accion-tutela/page.tsx` | Move to autoservicio route, use layout |
| `src/app/dashboard/generar-escritos/page.tsx` | Move to autoservicio/otros |
| `src/app/dashboard/analisis-caso/page.tsx` | Move to autoservicio/analisis-documentos |
| `src/app/dashboard/directorio-clientes/page.tsx` | Use layout |
| `src/app/dashboard/crear-caso/page.tsx` | Use layout, link from Casos hub |
| `src/app/dashboard/casos-*` | Use layout |
| `src/app/dashboard/layout.tsx` | Add if absent; wrap with sidebar layout |
| `public/locales/*/common.json` | Add sidebar labels |

**New files:**

- `src/app/dashboard/casos/page.tsx` – Casos hub
- `src/app/dashboard/autoservicio/` – Route group
- `src/app/dashboard/autoservicio/extraccion-datos/page.tsx`
- `src/app/dashboard/autoservicio/revision-email/page.tsx`

---

*End of assessment*
