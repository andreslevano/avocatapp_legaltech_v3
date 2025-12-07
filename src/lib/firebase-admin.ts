import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin with credentials
let adminApp: App;
if (!getApps().length) {
  try {
    // Check if we have Firebase Admin credentials
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || "avocat-legaltech-v3",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    console.log('🔍 Firebase Admin credentials check:');
    console.log('Project ID:', serviceAccount.projectId);
    console.log('Client Email:', serviceAccount.clientEmail ? 'Present' : 'Missing');
    console.log('Private Key:', serviceAccount.privateKey ? 'Present' : 'Missing');

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "avocat-legaltech-v3.appspot.com";
    
    if (serviceAccount.clientEmail && serviceAccount.privateKey) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
        storageBucket: storageBucket
      });
      console.log('✅ Firebase Admin initialized with service account credentials');
      console.log(`📦 Storage Bucket: ${storageBucket}`);
    } else {
      // Fallback to default credentials
      adminApp = initializeApp({
        projectId: "avocat-legaltech-v3",
        storageBucket: storageBucket
      });
      console.log('⚠️ Firebase Admin initialized with default credentials');
      console.log(`📦 Storage Bucket: ${storageBucket}`);
    }
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
