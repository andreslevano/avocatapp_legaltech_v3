#!/bin/bash

# Script para crear el servicio Cloud Run y hacer deploy
# Uso: ./deploy-cloud-run.sh

echo "=== 🚀 Deploy a Cloud Run ==="
echo ""

# Agregar gcloud al PATH
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"

# Verificar que gcloud está disponible
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI no está disponible"
  echo "Instálalo con: brew install --cask google-cloud-sdk"
  exit 1
fi

# Verificar autenticación
echo "1. Verificando autenticación..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "⚠️  No estás autenticado. Ejecutando login..."
  gcloud auth login
fi

# Configurar proyecto
echo ""
echo "2. Configurando proyecto..."
gcloud config set project avocat-legaltech-v3

# Crear servicio Cloud Run
echo ""
echo "3. Creando servicio Cloud Run: avocatapp-legaltech"
echo "   Esto puede tardar varios minutos..."
echo ""

gcloud run deploy avocatapp-legaltech \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --project avocat-legaltech-v3

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Servicio Cloud Run creado exitosamente"
  echo ""
  echo "4. Ahora puedes hacer deploy de Firebase Hosting:"
  echo "   firebase deploy --only hosting"
else
  echo ""
  echo "❌ Error creando el servicio"
  exit 1
fi





