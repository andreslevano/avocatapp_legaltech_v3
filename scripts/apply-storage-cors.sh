#!/bin/bash
# Apply CORS to Firebase Storage bucket for avocatapp.com and localhost.
# Required for: file uploads, OCR fallback (getBlob/fetch of PDFs from client).
# Run from project root: ./scripts/apply-storage-cors.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CORS_FILE="$PROJECT_ROOT/storage-cors.json"
BUCKET="gs://avocat-legaltech-v3.firebasestorage.app"

if [ ! -f "$CORS_FILE" ]; then
  echo "Error: storage-cors.json not found at $CORS_FILE"
  exit 1
fi

echo "Applying CORS from $CORS_FILE to $BUCKET..."
if command -v gcloud &> /dev/null; then
  gcloud storage buckets update "$BUCKET" --cors-file="$CORS_FILE"
  echo "Done. CORS applied successfully."
elif command -v gsutil &> /dev/null; then
  gsutil cors set "$CORS_FILE" "$BUCKET"
  echo "Done. CORS applied successfully."
else
  echo "Error: gcloud or gsutil not found. Install Google Cloud SDK."
  exit 1
fi
