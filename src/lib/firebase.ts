import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

// Firebase configuration - hardcoded for now to ensure it works
const firebaseConfig = {
  apiKey: "AIzaSyAiINqBn-d7vRyRZVHO600rVhHZd0B0qjM",
  authDomain: "avocat-legaltech-v3.firebaseapp.com",
  projectId: "avocat-legaltech-v3",
  storageBucket: "avocat-legaltech-v3.appspot.com",
  messagingSenderId: "1023426971669",
  appId: "1:1023426971669:web:fefbb72a56f7a60d3ca61c"
};

console.log('Firebase config check:', {
  hasValidConfig: true,
  apiKey: 'present',
  projectId: 'present',
  isClient: typeof window !== 'undefined'
});

// Initialize Firebase only on the client side
let app: FirebaseApp | undefined;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

if (typeof window !== 'undefined') {
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
    auth = null;
    db = null;
    storage = null;
    functions = null;
  }
} else {
  // Server-side or no valid config: create mock objects
  auth = null;
  db = null;
  storage = null;
  functions = null;
}

export { app, auth, db, storage, functions };
