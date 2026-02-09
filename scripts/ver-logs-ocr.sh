#!/bin/bash

# Script para ver logs de OCR y ChatGPT en tiempo real

echo "🔍 Ver logs de OCR y ChatGPT"
echo "=============================="
echo ""
echo "Selecciona qué logs quieres ver:"
echo "1. OCR y Análisis (ocrAndAnalyze)"
echo "2. Análisis de Éxito (analisisExito)"
echo "3. Todos los logs"
echo ""
read -p "Opción (1-3): " opcion

case $opcion in
  1)
    echo ""
    echo "📄 Logs de OCR y Análisis (últimos 50):"
    echo "========================================"
    gcloud functions logs read ocrAndAnalyze --gen2 --region=us-central1 --limit=50
    ;;
  2)
    echo ""
    echo "📊 Logs de Análisis de Éxito (últimos 50):"
    echo "==========================================="
    firebase functions:log --only analisisExito | head -100
    ;;
  3)
    echo ""
    echo "📄 Logs de OCR y Análisis:"
    echo "=========================="
    gcloud functions logs read ocrAndAnalyze --gen2 --region=us-central1 --limit=30
    echo ""
    echo "📊 Logs de Análisis de Éxito:"
    echo "=============================="
    firebase functions:log --only analisisExito | head -50
    ;;
  *)
    echo "Opción inválida"
    exit 1
    ;;
esac

echo ""
echo "✅ Para ver logs en tiempo real, usa:"
echo "   watch -n 2 'gcloud functions logs read ocrAndAnalyze --gen2 --region=us-central1 --limit=10'"



