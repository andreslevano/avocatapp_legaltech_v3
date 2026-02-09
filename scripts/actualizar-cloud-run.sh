#!/bin/bash

echo "=== 🔧 Actualizando configuración de Cloud Run ==="
echo ""

SERVICE_NAME="avocatapp-legaltech"
REGION="us-central1"
PROJECT_ID="avocat-legaltech-v3"

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null
then
    echo "❌ gcloud CLI no está instalado. Por favor, instálalo primero."
    exit 1
fi

# Configurar proyecto
echo "1. Configurando proyecto..."
gcloud config set project $PROJECT_ID
echo "✅ Proyecto configurado: $PROJECT_ID"
echo ""

# Actualizar servicio con nuevas configuraciones
echo "2. Actualizando configuración del servicio Cloud Run..."
echo "   Esto puede tardar 1-2 minutos..."
echo ""

gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --memory=1Gi \
  --timeout=3600 \
  --execution-environment=gen2 \
  --min-instances=1 \
  --cpu=1 \
  --max-instances=100 \
  --concurrency=80 \
  --allow-unauthenticated

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuración actualizada exitosamente!"
    echo ""
    echo "📊 Configuración aplicada:"
    echo "   - Memoria: 1 GiB"
    echo "   - Tiempo de espera: 3600 segundos (1 hora)"
    echo "   - Entorno: Segunda generación (gen2)"
    echo "   - Instancias mínimas: 1"
    echo "   - CPU: 1"
    echo "   - Simultaneidad: 80"
    echo ""
    echo "🔗 URL del servicio:"
    gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"
else
    echo ""
    echo "❌ Error al actualizar la configuración."
    echo "   Verifica que el servicio existe y que tienes permisos."
    exit 1
fi





