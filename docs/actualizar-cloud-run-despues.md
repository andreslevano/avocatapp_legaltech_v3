# 🔧 Actualizar Configuración de Cloud Run Después de Crearlo

Si creaste el servicio Cloud Run con la configuración por defecto, puedes actualizarlo después usando estos comandos.

## 🚀 Opción 1: Script Automático

Ejecuta el script que actualiza todo automáticamente:

```bash
./scripts/actualizar-cloud-run.sh
```

## 📝 Opción 2: Comandos Manuales

Si prefieres ejecutar los comandos uno por uno:

### 1. Actualizar Memoria

```bash
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --memory=1Gi
```

### 2. Actualizar Tiempo de Espera

```bash
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --timeout=3600
```

### 3. Actualizar Entorno de Ejecución (Segunda Generación)

```bash
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --execution-environment=gen2
```

### 4. Actualizar Instancias Mínimas

```bash
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --min-instances=1
```

### 5. Actualizar Todo de Una Vez

```bash
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --memory=1Gi \
  --timeout=3600 \
  --execution-environment=gen2 \
  --min-instances=1 \
  --cpu=1 \
  --max-instances=100 \
  --concurrency=80 \
  --allow-unauthenticated
```

## ✅ Verificar Configuración Actual

Para ver la configuración actual del servicio:

```bash
gcloud run services describe avocatapp-legaltech \
  --region=us-central1 \
  --format="yaml"
```

O ver solo los campos importantes:

```bash
gcloud run services describe avocatapp-legaltech \
  --region=us-central1 \
  --format="table(
    spec.template.spec.containers[0].resources.limits.memory,
    spec.template.spec.timeoutSeconds,
    spec.template.spec.containers[0].resources.limits.cpu,
    spec.template.metadata.annotations.'autoscaling.knative.dev/minScale',
    spec.template.spec.containers[0].resources.requests.memory
  )"
```

## 📋 Configuración Recomendada Final

Después de ejecutar los comandos, tu servicio debería tener:

- **Memoria**: 1 GiB (o 2 GiB si necesitas más)
- **Tiempo de espera**: 3600 segundos (1 hora)
- **Entorno**: Segunda generación (gen2)
- **Instancias mínimas**: 1
- **CPU**: 1
- **Simultaneidad**: 80
- **Autenticación**: Público (allow-unauthenticated)

## ⚠️ Notas Importantes

1. **Cada actualización puede tardar 1-2 minutos** mientras Cloud Run aplica los cambios
2. **El servicio seguirá funcionando** durante la actualización (sin downtime)
3. **Los costos aumentarán ligeramente** con `min-instances=1` (se cobra por instancia activa)
4. **Puedes revertir cualquier cambio** ejecutando el comando con el valor anterior

## 🔄 Revertir Cambios

Si necesitas revertir algún cambio:

```bash
# Volver a 0 instancias mínimas (ahorrar costos)
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --min-instances=0

# Volver a 512 MiB de memoria
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --memory=512Mi

# Volver a entorno predeterminado
gcloud run services update avocatapp-legaltech \
  --region=us-central1 \
  --execution-environment=gen1
```





