# Firebase Storage CORS Configuration

## Problem

When uploading files from `avocatapp.com`, you may see:

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'https://avocatapp.com' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

This happens because Firebase Storage (Google Cloud Storage) blocks cross-origin requests by default. Your custom domain `avocatapp.com` must be explicitly allowed.

## Solution

Configure CORS on the Storage bucket to allow your domains.

### Option 1: Using gcloud CLI (recommended)

1. **Install Google Cloud SDK** if not already installed:
   - https://cloud.google.com/sdk/docs/install

2. **Authenticate**:
   ```bash
   gcloud auth login
   gcloud config set project avocat-legaltech-v3
   ```

3. **Apply CORS configuration**:
   ```bash
   gcloud storage buckets update gs://avocat-legaltech-v3.firebasestorage.app --cors-file=storage-cors.json
   ```

### Option 2: Using gsutil

1. **Install gsutil** (comes with gcloud) or use Cloud Shell.

2. **Apply CORS**:
   ```bash
   gsutil cors set storage-cors.json gs://avocat-legaltech-v3.firebasestorage.app
   ```

### Option 3: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project `avocat-legaltech-v3`
3. Navigate to **Cloud Storage** → **Buckets**
4. Click on `avocat-legaltech-v3.firebasestorage.app`
5. Note: CORS cannot be managed via the Console UI. Use gcloud or gsutil as above.

## Verify

After applying, try uploading a file again from https://avocatapp.com/dashboard/autoservicio/extraccion-datos

## Domains included in storage-cors.json

- `https://avocatapp.com` (production)
- `https://www.avocatapp.com`
- `https://avocat-legaltech-v3.web.app` (Firebase Hosting)
- `https://avocat-legaltech-v3.firebaseapp.com`
- `http://localhost:3000` (development)
- `http://127.0.0.1:3000` (development)
