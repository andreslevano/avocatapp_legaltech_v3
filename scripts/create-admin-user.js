const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar Firebase Admin
const app = initializeApp({
  projectId: "avocat-legaltech-v3"
});

const db = getFirestore(app);

async function createAdminUser() {
  try {
    console.log('🔧 Creando usuario administrador de prueba...');
    
    const adminData = {
      uid: 'demo_admin_user',
      email: 'admin@avocat-legaltech.com',
      displayName: 'Administrador Demo',
      role: 'admin',
      isAdmin: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true,
      permissions: {
        canViewUsers: true,
        canEditUsers: true,
        canViewAnalytics: true,
        canGenerateEmails: true,
        canSendEmails: true,
        canViewDocuments: true,
        canDeleteDocuments: true
      },
      stats: {
        totalDocuments: 0,
        totalGenerations: 0,
        totalSpent: 0
      },
      subscription: {
        plan: 'enterprise',
        startDate: new Date().toISOString(),
        isActive: true
      },
      preferences: {
        language: 'es',
        notifications: true,
        theme: 'light'
      }
    };

    await db.collection('users').doc('demo_admin_user').set(adminData);
    
    console.log('✅ Usuario administrador creado exitosamente:');
    console.log(`   - UID: demo_admin_user`);
    console.log(`   - Email: admin@avocat-legaltech.com`);
    console.log(`   - Rol: admin`);
    console.log(`   - Permisos: completos`);
    
    console.log('\n🎯 Ahora puedes acceder al dashboard de administrador en:');
    console.log('   http://localhost:3001/dashboard/administrador');
    
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
  }
}

createAdminUser();


