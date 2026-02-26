# Análisis: Por qué falla el build si el deploy funcionaba

## Resumen

El build de Next.js falla con `ENOENT: pages-manifest.json` al ejecutarse desde el sandbox de Cursor, pero el `version.json` indica que un deploy completó correctamente hoy (2026-02-26 12:41:38).

## Hallazgos

### 1. **Cambio crítico en deploy.sh (commit bb4f75d1, 20 Feb 2026)**

**Antes:**
```bash
rm -rf .next node_modules/.cache out   # Eliminaba TODO al inicio
# ...
rm -rf out                             # Solo out antes del build
npm run build
```

**Después (actual):**
```bash
rm -rf node_modules/.cache out         # "Keep .next" - NO elimina .next al inicio
# ...
rm -rf .next out                       # Pero SÍ lo elimina antes del build
npm run build
```

El comentario dice "Keep .next for incremental build stability (avoids _error.js.nft.json ENOENT)" pero el script **sigue eliminando .next** en la línea `rm -rf .next out` antes del build. Es contradictorio.

### 2. **Hipótesis: el intento era builds incrementales**

La idea del cambio era **no** borrar `.next` al inicio para aprovechar builds incrementales. Pero al mantener `rm -rf .next out` antes del build, se sigue haciendo un build limpio cada vez.

### 3. **Por qué funcionaba antes**

- **Entorno**: El script indica "run outside restricted sandboxes". Es probable que los deploys exitosos se hayan ejecutado desde la terminal del usuario, no desde Cursor.
- **Sandbox de Cursor**: Puede limitar operaciones de disco o procesos hijos y provocar que Next.js no genere correctamente `.next/server/pages-manifest.json`.

### 4. **Bug conocido de Next.js 14**

Existen scripts `fix-build.js` y `fix-build-watch.js` que documentan:
- `pages-manifest.json` ENOENT
- `_error.js.nft.json` ENOENT

Es decir, estos fallos ya se habían detectado y se crearon workarounds.

## Recomendaciones

### Opción A: Probar build incremental (alineado con el comentario)

No borrar `.next` antes del build, solo `out`:

```bash
# En deploy.sh, cambiar:
rm -rf .next out
npm run build

# Por:
rm -rf out
npm run build
```

### Opción B: Ejecutar fuera de Cursor

Ejecutar el deploy desde la terminal del sistema:

```bash
cd "/Users/andreslevano/Desktop/MAD Cloud Consulting/Productos/Cursor - sandbox/avocat-legaltech-v3"
./scripts/deploy.sh
```

### Opción C: Reintegrar fix-build-watch

Volver a usar el workaround que creaba los manifests durante el build (cuando funcionaba con el sandbox).
