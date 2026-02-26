# Recuperación del proyecto tras deploy c640a3

## Estado del deploy c640a3

Has restaurado el sitio con el deploy **c640a3** (142 archivos) desde Firebase Hosting. El commit `c640a3` no aparece en el historial local actual; puede ser de otra rama o de un deploy anterior no pusheado.

## Cambios aplicados para recuperar el proyecto

1. **Archivos restaurados** al estado del commit `ed71ba8a` (HEAD de dev):
   - `scripts/deploy.sh`
   - `package.json`
   - `.gitignore`
   - `scripts/fix-build.js`
   - `scripts/fix-build-watch.js`

2. **Estructura API**: `src/app/api` restaurado (extraccion-datos, stripe) para que el deploy pueda moverlo a `api.disabled` durante el build.

## Features incluidas en la versión actual (ed71ba8a)

- **Extracción de datos**: `src/app/dashboard/autoservicio/extraccion-datos/`, `src/lib/document-ai.ts`, `src/lib/openai.ts`
- **Reclamación de cantidades**: migración Firestore, dashboard
- **Productos**: material estudiantes, autoservicio, gestión abogados
- **Stripe**: checkout, webhook (Firebase Functions)
- **Páginas legales**: cookies, privacidad, términos, GDPR, contacto
- **Auth**: login, signup, forgot-password, reset-password
- **Dashboard**: casos, administrador, directorio clientes, etc.

## Cómo desplegar correctamente

**Importante**: Ejecuta el deploy **fuera del sandbox de Cursor**, en la terminal del sistema:

```bash
cd "/Users/andreslevano/Desktop/MAD Cloud Consulting/Productos/Cursor - sandbox/avocat-legaltech-v3"
./scripts/deploy.sh
```

El build de Next.js puede fallar dentro de Cursor por restricciones del sandbox. En la terminal del sistema suele completarse bien.

## Cambios locales no restaurados (pendientes de commit)

Estos archivos siguen con cambios respecto a `ed71ba8a`:

- `src/app/dashboard/autoservicio/extraccion-datos/page.tsx` – mejoras de preview y OCR
- `src/lib/openai.ts`, `src/lib/document-ai.ts` – prompts multi-invoice
- `src/app/layout.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`
- `src/components/Pricing.tsx`, `src/components/Sidebar.tsx`
- `src/lib/storage.ts`

Si quieres conservar solo el estado desplegado, haz `git restore` de esos archivos. Si quieres mantener las mejoras, haz commit cuando el deploy funcione.

## Si el build sigue fallando

1. Probar sin `--experimental-build-mode compile` en `package.json`:
   ```json
   "build": "next build"
   ```

2. Usar el workaround `fix-build-watch` añadiendo en `deploy.sh` antes de `npm run build`:
   ```bash
   node scripts/fix-build-watch.js &
   WATCH_PID=$!
   npm run build
   kill $WATCH_PID 2>/dev/null || true
   ```
