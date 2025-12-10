# 📋 Configuración Recomendada para Cloud Run

## ✅ Configuraciones Correctas (Ya las tienes)

- **Nombre de Servicio**: `avocatapp-legaltech` ✅
- **Región**: `us-central1 (Iowa)` ✅
- **Autenticación**: `Permite el acceso público` ✅
- **Repositorio de origen**: `GitHub` ✅
- **Rama**: `dev` (asegúrate de seleccionar la rama correcta)
- **CPU**: `1` ✅
- **Simultaneidad**: `80` ✅

## ⚠️ Configuraciones a CAMBIAR

### 1. **Memoria**
- **Actual**: `512 MiB`
- **Recomendado**: `1 GiB` o `2 GiB`
- **Razón**: Next.js, generación de PDFs y procesamiento de OCR necesitan más memoria

### 2. **Tiempo de espera de la solicitud**
- **Actual**: `300 segundos`
- **Recomendado**: `3600 segundos` (máximo)
- **Razón**: La generación de documentos con IA puede tardar varios minutos

### 3. **Entorno de ejecución**
- **Actual**: `Predeterminada`
- **Recomendado**: `Segunda generación`
- **Razón**: Mejor rendimiento, compatibilidad total con Linux, CPU y red más rápidos

### 4. **Número mínimo de instancias** (en "Escalamiento de servicios")
- **Actual**: `0`
- **Recomendado**: `1`
- **Razón**: Reduce los "cold starts" (tiempos de inicio en frío) cuando no hay tráfico
- **Nota**: Esto aumenta los costos ligeramente, pero mejora la experiencia del usuario

### 5. **Puerto de contenedor**
- **Actual**: `8080`
- **Recomendado**: `8080` ✅ (está bien)
- **Razón**: Next.js detecta automáticamente la variable de entorno `PORT` que Cloud Run establece

## 📝 Pasos para Configurar

1. **En la sección "Recursos"**:
   - Cambia **Memoria** de `512 MiB` a `1 GiB` (o `2 GiB` si tienes presupuesto)

2. **En la sección "Verificaciones de estado"**:
   - Cambia **Tiempo de espera de la solicitud** de `300` a `3600` segundos

3. **En la sección "Entorno de ejecución"**:
   - Selecciona **Segunda generación** en lugar de "Predeterminada"

4. **En la sección "Escalamiento de servicios"**:
   - Cambia **Número mínimo de instancias** de `0` a `1`

5. **En la sección "Repositorio de origen"**:
   - Asegúrate de que la **Rama** sea `dev`
   - El **Build type** debe ser `Buildpacks` (detecta automáticamente Next.js)

## 🔧 Variables de Entorno

**IMPORTANTE**: Después de crear el servicio, necesitarás configurar las variables de entorno en la sección "Variables y secretos". Las variables necesarias están en `env.example`.

## 💰 Costos Estimados

Con estas configuraciones:
- **Nivel gratuito**: Primeros 180,000 unidades de CPU virtuales segundo/mes
- **Nivel gratuito**: Primeros 360,000 GiB segundo/mes
- **Nivel gratuito**: 2 millones de solicitudes/mes
- **Con 1 instancia mínima**: ~$10-15/mes adicionales (depende del uso)

## ✅ Checklist Final

Antes de hacer clic en **CREATE** o **CREAR**, verifica:

- [ ] Nombre: `avocatapp-legaltech`
- [ ] Región: `us-central1`
- [ ] Autenticación: `Permite el acceso público`
- [ ] Memoria: `1 GiB` o `2 GiB`
- [ ] Tiempo de espera: `3600 segundos`
- [ ] Entorno: `Segunda generación`
- [ ] Número mínimo de instancias: `1`
- [ ] Puerto: `8080`
- [ ] Repositorio: GitHub, rama `dev`
- [ ] Build type: `Buildpacks`

## 🚀 Después de Crear el Servicio

1. **Configurar variables de entorno** en la sección "Variables y secretos"
2. **Esperar el primer despliegue** (5-10 minutos)
3. **Verificar que la URL funciona**: `https://avocatapp-legaltech-1023426971669.us-central1.run.app`
4. **Hacer deploy de Firebase Hosting** para conectar el dominio `avocatapp.com`



