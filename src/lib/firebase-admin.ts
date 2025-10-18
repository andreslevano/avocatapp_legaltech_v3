import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin (sin credenciales para desarrollo)
let adminApp: App;
if (!getApps().length) {
  try {
    adminApp = initializeApp({
      projectId: "avocat-legaltech-v3",
      storageBucket: "avocat-legaltech-v3.appspot.com"
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    // Fallback básico
    adminApp = initializeApp({
      projectId: "avocat-legaltech-v3"
    });
  }
} else {
  adminApp = getApps()[0];
}

// Export Firestore and Storage instances
export function db() {
  return getFirestore(adminApp);
}

export function storage() {
  return getStorage(adminApp);
}

export function getAdmin() {
  return adminApp;
}
