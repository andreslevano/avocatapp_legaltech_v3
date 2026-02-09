# 📋 Configuración del Repositorio para Cloud Run

## ✅ Pasos en la Interfaz de Cloud Run

### 1. Autenticarse con GitHub

1. Haz clic en **"Autenticarse"** o **"Authenticate"** junto a "No estás autenticado"
2. Se abrirá una ventana para autorizar a Google Cloud a acceder a tu cuenta de GitHub
3. Selecciona los repositorios que quieres dar acceso (o todos)
4. Autoriza la conexión

### 2. Seleccionar Repositorio

Una vez autenticado:
- **Repositorio**: Selecciona `andreslevano/avocatapp_legaltech_v3`
- **Rama**: Selecciona `dev` (o la rama que quieras desplegar)

### 3. Configuración de Compilación

**Build type (Tipo de compilación)**: 
- Selecciona **"Buildpacks"** (recomendado)
  - Cloud Build detectará automáticamente que es Next.js
  - Usará el buildpack de Node.js/Next.js
  - No necesitas configurar nada más

**O si prefieres usar Dockerfile**:
- Selecciona **"Dockerfile"**
  - Usará el `Dockerfile` que creamos en el proyecto
  - Más control sobre el proceso de build

### 4. Configuración Avanzada (Opcional)

En la sección "Configuración de compilación", puedes:
- **Build timeout**: Dejar el valor por defecto (10 minutos) o aumentarlo si el build es lento
- **Machine type**: Dejar el valor por defecto (n1-standard-1) está bien

## 🔧 Archivos Creados para Cloud Run

He creado los siguientes archivos para que Cloud Run funcione correctamente:

### 1. `server.js`
- Script de inicio personalizado que usa la variable `PORT` de Cloud Run
- Escucha en `0.0.0.0` (necesario para Cloud Run)
- Maneja correctamente las solicitudes HTTP

### 2. `Dockerfile` (opcional)
- Si prefieres usar Dockerfile en lugar de Buildpacks
- Optimizado para producción con multi-stage build
- Usa Node.js 20 Alpine (imagen ligera)

### 3. `package.json` actualizado
- Script `start` ahora usa `server.js` en lugar de `next start`
- Esto asegura que Next.js use el puerto correcto (`$PORT`)

### 4. `next.config.js` actualizado
- Agregado `output: 'standalone'` para producción
- Genera una versión optimizada para Cloud Run

## ⚠️ Importante: Variable PORT

Cloud Run establece automáticamente la variable de entorno `PORT` (normalmente `8080`). 

El `server.js` que creamos detecta automáticamente esta variable:
```javascript
const port = process.env.PORT || 3000;
```

## ✅ Checklist

Antes de continuar, verifica:

- [ ] Autenticado con GitHub
- [ ] Repositorio seleccionado: `andreslevano/avocatapp_legaltech_v3`
- [ ] Rama seleccionada: `dev`
- [ ] Build type: `Buildpacks` (o `Dockerfile` si prefieres)
- [ ] Los archivos `server.js`, `Dockerfile` y `package.json` están en el repositorio

## 🚀 Siguiente Paso

Después de configurar el repositorio, continúa con:
1. Configurar variables de entorno (en la sección "Variables y secretos")
2. Revisar la configuración de recursos (memoria, CPU, etc.)
3. Hacer clic en **CREATE** o **CREAR**





