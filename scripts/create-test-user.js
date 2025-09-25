// Script para crear un usuario de prueba en Firebase
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyAiINqBn-d7vRyRZVHO600rVhHZd0B0qjM",
  authDomain: "avocat-legaltech-v3.firebaseapp.com",
  projectId: "avocat-legaltech-v3",
  storageBucket: "avocat-legaltech-v3.appspot.com",
  messagingSenderId: "1023426971669",
  appId: "1:1023426971669:web:fefbb72a56f7a60d3ca61c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createTestUser() {
  try {
    console.log('🔐 Creando usuario de prueba...');
    
    const email = 'demo@avocat.com';
    const password = 'demo123456';
    
    // Intentar crear el usuario
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Usuario creado exitosamente:', userCredential.user.email);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ El usuario ya existe, probando login...');
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log('✅ Login exitoso con usuario existente:', userCredential.user.email);
        } catch (loginError) {
          console.error('❌ Error en login:', loginError.message);
        }
      } else {
        console.error('❌ Error creando usuario:', error.message);
      }
    }
    
    console.log('\n📋 Credenciales de prueba:');
    console.log('Email: demo@avocat.com');
    console.log('Password: demo123456');
    console.log('\n🌐 Puedes usar estas credenciales en http://localhost:3000/login');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

createTestUser();
