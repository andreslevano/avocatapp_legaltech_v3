import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

// Check if we have proper Firebase configuration
const hasValidConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key' &&
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-project';

const firebaseConfig = hasValidConfig ? {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} : null;

// Initialize Firebase only on the client side and with valid config
let app: FirebaseApp | undefined;
let auth: Auth | Record<string, never>;
let db: Firestore | Record<string, never>;
let storage: FirebaseStorage | Record<string, never>;
let functions: Functions | Record<string, never>;

if (typeof window !== 'undefined' && hasValidConfig && firebaseConfig) {
  // Client-side initialization with valid config
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    // Connect to emulators in development
    if (process.env.NODE_ENV === 'development') {
      try {
        if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
          connectAuthEmulator(auth as Auth, 'http://localhost:9099');
          connectFirestoreEmulator(db as Firestore, 'localhost', 8080);
          connectStorageEmulator(storage as FirebaseStorage, 'localhost', 9199);
          connectFunctionsEmulator(functions as Functions, 'localhost', 5001);
        }
      } catch {
        console.log('Firebase emulators already connected or not available');
      }
    }
  } catch {
    console.error('Error initializing Firebase');
    // Create mock objects for build time
    auth = {};
    db = {};
    storage = {};
    functions = {};
  }
} else {
  // Server-side or no valid config: create mock objects
  auth = {};
  db = {};
  storage = {};
  functions = {};
}

export { app, auth, db, storage, functions };
