# 📊 Radiografía Completa de Firestore - Avocat LegalTech v3

**Fecha de análisis:** $(date)  
**Proyecto:** avocat-legaltech-v3

---

## 📈 Resumen Ejecutivo

### Estadísticas Generales

| Métrica | Cantidad |
|---------|----------|
| 👥 Usuarios en Firebase Auth | 14 |
| 👥 Usuarios en Firestore | 14 |
| 📄 Documentos generados | 2 |
| 💳 Compras | 28 |
| 📋 Reclamaciones | 0 |
| ⚖️ Tutelas | 0 |
| 📁 Casos | 2 |
| 📧 Emails | 2 |

---

## 1️⃣ Firebase Auth - Usuarios

### Estadísticas de Autenticación

- **Total de usuarios:** 14
- **Emails verificados:** 2 (14.3%)
- **Emails no verificados:** 12 (85.7%)
- **Usuarios deshabilitados:** 0
- **Usuarios activos:** 14 (100%)

### Proveedores de Autenticación

- **Password (email/password):** 14 usuarios (100%)

### Lista de Usuarios

1. **danielgarciamarino945@gmail.com**
   - UID: `BH84VzU0uKeVTy0zT8YXWT7hkk53`
   - Creado: 03 Sep 2025
   - Último login: 15 Nov 2025
   - ✅ Email verificado

2. **vergarabularz@yahoo.com**
   - UID: `EoxPDhUjf0f0GGEqe8kvxB9FBdk2`
   - Creado: 16 Sep 2025
   - ❌ Email no verificado

3. **pena.pineda.sergio@gmail.com**
   - UID: `GBMnLNUnH3NRMo61jVKPHCVOxAE3`
   - Creado: 03 Sep 2025
   - Último login: 13 Nov 2025
   - ❌ Email no verificado

4. **usuario.test@avocat.com**
   - UID: `Q62ZKh76u9dGmbgCb4ocGdg4GhE2`
   - Creado: 22 Oct 2025
   - ❌ Email no verificado

5. **krolhx@hotmail.com**
   - UID: `Up5SgswRu7fpiyt8uLvCuaV5mU42`
   - Creado: 10 Sep 2025
   - Último login: 29 Sep 2025
   - ❌ Email no verificado

6. **dgos8825@gmail.com**
   - UID: `VugYjlKhGyQG3C98fqbn6Fu2sMl1`
   - Creado: 07 Sep 2025
   - Último login: 10 Sep 2025
   - ❌ Email no verificado

7. **locarno.isacco@gmail.com**
   - UID: `awR2MQfPrGXydRcZ2nDPUrEJrUI3`
   - Creado: 05 Sep 2025
   - Último login: 17 Sep 2025
   - ✅ Email verificado

8. **demo@avocat.com**
   - UID: `fAF5TgZ8WPYaAHTcGn6dtOtm40x1`
   - Creado: 23 Sep 2025
   - Último login: 24 Sep 2025
   - ❌ Email no verificado

9. **dchavez17021980@gmail.com**
   - UID: `gmrsy7nCLfeKsuX2KGkJCWVX0mX2`
   - Creado: 07 Sep 2025
   - ❌ Email no verificado

10. **test@avocat.com**
    - UID: `hSu7KsIBlTepIoMZ4N1SNX2oXn23`
    - Creado: 22 Sep 2025
    - Último login: 23 Sep 2025
    - ❌ Email no verificado

*(Y 4 usuarios más...)*

---

## 2️⃣ Colecciones de Firestore

### 📁 users (14 documentos)

**Campos principales:**
- `uid` (100% de documentos)
- `email` (100%)
- `isActive` (100%)
- `createdAt` (100%)
- `displayName` (78.6%)
- `isAdmin` (85.7%)
- `role` (64.3%)
- `lastLoginAt` (78.6%)
- `subscription` (64.3%)
- `preferences` (64.3%)
- `stats` (64.3%)

**Estado:** ✅ Todos los usuarios de Auth tienen documento en Firestore

---

### 📄 documents (2 documentos)

**Estructura:**
- `status`: string
- `title`: string
- `content`: string
- `userId`: string
- `createdAt`: string
- `type`: string ('reclamacion_cantidad' | 'accion_tutela')
- `caseId`: string
- `pdfUrl`: string

**Problema detectado:** ⚠️ 2 documentos tienen `userId` inválido:
- `doc-1` con `userId: test-user-1`
- `doc-2` con `userId: test-user-2`

Estos IDs no corresponden a usuarios reales en Auth/Firestore.

---

### 💳 purchases (28 documentos)

**Estructura:**
- `userId` (96.4%)
- `customerEmail` (89.3%)
- `stripeSessionId` (39.3%)
- `stripePaymentIntentId` (39.3%)
- `items` (89.3%)
- `total` (89.3%)
- `currency` (96.4%) - siempre 'EUR'
- `status` (100%) - siempre 'completed'
- `createdAt` (96.4%)

**Observaciones:**
- Solo 39.3% tienen IDs de Stripe (probablemente compras de prueba)
- Todos tienen status 'completed'
- Moneda siempre en EUR

---

### 📋 reclamaciones (0 documentos)

**Estado:** ⚠️ Colección vacía

---

### ⚖️ tutelas (0 documentos)

**Estado:** ⚠️ Colección vacía

---

### 📁 cases (2 documentos)

**Estructura:**
- `currency`: string (EUR)
- `amount`: number
- `client`: object (name, email, phone)
- `createdAt`: string
- `description`: string
- `userId`: string
- `priority`: string
- `title`: string
- `status`: string
- `updatedAt`: string

**Ejemplos:**
1. Reclamación de cantidad - Factura impagada (€1,575.40)
2. Acción de tutela - Derecho a la educación (€0)

---

### 📧 email_sends (2 documentos)

**Estructura:**
- `emailId`: string
- `userEmail`: string
- `subject`: string
- `pdfUrl`: string
- `sentAt`: string
- `status`: string
- `provider`: string (mock)
- `messageId`: string
- `metadata`: object

**Observaciones:**
- Provider es 'mock' (emails de prueba)
- Todos con status 'sent'

---

### 📝 templates (2 documentos)

**Estructura:**
- `name`: string
- `description`: string
- `category`: string
- `content`: string
- `createdBy`: string (system)
- `isPublic`: boolean (true)
- `createdAt`: string

**Tipos:**
1. Reclamación de Cantidad - Estándar (civil)
2. Acción de Tutela - Educación (constitucional)

---

### ⚠️ Colecciones Vacías

- `reclamaciones` (0 documentos)
- `tutelas` (0 documentos)
- `generated_emails` (0 documentos)
- `document_analysis` (0 documentos)
- `analytics` (0 documentos)
- `admin` (0 documentos)
- `legal_areas` (0 documentos)

---

## 3️⃣ Análisis de Relaciones y Consistencia

### ✅ Aspectos Positivos

1. **Sincronización Auth ↔ Firestore:** Perfecta
   - 0 usuarios en Auth sin documento Firestore
   - 0 documentos Firestore sin usuario Auth

2. **Consistencia de datos:** Buena estructura general

### ⚠️ Problemas Detectados

1. **Documentos huérfanos:** 2 documentos con `userId` inválido
   - Estos documentos no pueden vincularse a usuarios reales
   - Probablemente fueron creados durante pruebas con IDs ficticios

2. **Colecciones sin uso:**
   - `reclamaciones` y `tutelas` están vacías, pero existen estructuras de datos
   - Sugiere que los datos se están guardando en otras colecciones o subcolecciones

3. **Subcolecciones:**
   - No se encontraron subcolecciones en los primeros 10 usuarios
   - Si se usa `users/{uid}/documents`, no está siendo utilizado actualmente

---

## 4️⃣ Recomendaciones

### 🔧 Correcciones Urgentes

1. **Revisar documentos huérfanos:**
   - Vincular los 2 documentos con `userId: test-user-1` y `test-user-2` a usuarios reales
   - O eliminarlos si son datos de prueba

2. **Unificar colecciones:**
   - Decidir si usar `reclamaciones`/`tutelas` o solo `documents`
   - Actualmente hay inconsistencia

### 📊 Mejoras Recomendadas

1. **Índices compuestos:**
   - Crear índice para `documents` con `userId` + `createdAt`
   - Crear índice para `purchases` con `userId` + `createdAt`
   - Crear índice para `email_sends` con `userEmail` + `sentAt`

2. **Limpieza de datos:**
   - Revisar compras de prueba (sin `stripeSessionId`)
   - Verificar emails mock que deberían ser reales

3. **Validación de datos:**
   - Asegurar que todos los documentos tengan `userId` válido
   - Validar que emails de usuarios sean únicos

4. **Monitoreo:**
   - Implementar alertas para documentos huérfanos
   - Trackear usuarios sin email verificado

---

## 5️⃣ Modelo de Datos Actual

### Estructura Principal

```
Firebase Auth
  └── 14 usuarios
  
Firestore
  ├── users/ (14 docs)
  │   └── Estructura: uid, email, isActive, stats, subscription
  │
  ├── documents/ (2 docs)
  │   └── Estructura: userId, type, status, title, content, createdAt
  │   ⚠️ 2 docs con userId inválido
  │
  ├── purchases/ (28 docs)
  │   └── Estructura: userId, items, total, status, stripeSessionId
  │
  ├── cases/ (2 docs)
  │   └── Estructura: userId, title, status, amount, client
  │
  ├── email_sends/ (2 docs)
  │   └── Estructura: userEmail, subject, status, provider
  │
  ├── templates/ (2 docs)
  │   └── Estructura: name, category, content, isPublic
  │
  └── [Vacías]
      ├── reclamaciones
      ├── tutelas
      ├── generated_emails
      ├── document_analysis
      ├── analytics
      ├── admin
      └── legal_areas
```

---

## 📝 Notas Finales

- **Base de datos saludable:** La mayoría de datos están bien estructurados
- **Uso inicial:** Parece ser una base de datos en fase de desarrollo/pruebas
- **Volumen bajo:** Pocos documentos reales, probablemente en desarrollo
- **Necesita limpieza:** Algunos datos de prueba mezclados con datos reales

---

**Generado por:** Script de radiografía Firestore  
**Herramienta:** `scripts/firestore-radiography.js`




