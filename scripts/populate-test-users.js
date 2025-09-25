const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar Firebase Admin
const app = initializeApp({
  projectId: "avocat-legaltech-v3"
});

const db = getFirestore(app);

async function populateTestUsers() {
  try {
    console.log('👥 Creando usuarios de prueba...');
    
    const testUsers = [
      {
        uid: 'user_001',
        email: 'juan.perez@email.com',
        displayName: 'Juan Pérez',
        role: 'user',
        isAdmin: false,
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días atrás
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 días atrás
        stats: {
          totalDocuments: 5,
          totalGenerations: 5,
          totalSpent: 25.00
        },
        subscription: {
          plan: 'premium',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        }
      },
      {
        uid: 'user_002',
        email: 'maria.garcia@email.com',
        displayName: 'María García',
        role: 'user',
        isAdmin: false,
        isActive: true,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 días atrás
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 día atrás
        stats: {
          totalDocuments: 3,
          totalGenerations: 3,
          totalSpent: 15.00
        },
        subscription: {
          plan: 'basic',
          startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        }
      },
      {
        uid: 'user_003',
        email: 'carlos.lopez@email.com',
        displayName: 'Carlos López',
        role: 'user',
        isAdmin: false,
        isActive: false,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 días atrás
        lastLoginAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días atrás
        stats: {
          totalDocuments: 2,
          totalGenerations: 2,
          totalSpent: 10.00
        },
        subscription: {
          plan: 'free',
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: false
        }
      },
      {
        uid: 'user_004',
        email: 'ana.martinez@email.com',
        displayName: 'Ana Martínez',
        role: 'user',
        isAdmin: false,
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días atrás
        lastLoginAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hora atrás
        stats: {
          totalDocuments: 8,
          totalGenerations: 8,
          totalSpent: 40.00
        },
        subscription: {
          plan: 'enterprise',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true
        }
      }
    ];

    // Crear usuarios en Firestore
    for (const user of testUsers) {
      await db.collection('users').doc(user.uid).set(user);
      console.log(`✅ Usuario creado: ${user.displayName} (${user.email})`);
    }
    
    console.log(`\n🎉 ${testUsers.length} usuarios de prueba creados exitosamente!`);
    console.log('\n📊 Resumen:');
    console.log(`   - Usuarios activos: ${testUsers.filter(u => u.isActive).length}`);
    console.log(`   - Usuarios inactivos: ${testUsers.filter(u => !u.isActive).length}`);
    console.log(`   - Total documentos: ${testUsers.reduce((sum, u) => sum + u.stats.totalDocuments, 0)}`);
    console.log(`   - Ingresos totales: €${testUsers.reduce((sum, u) => sum + u.stats.totalSpent, 0)}`);
    
  } catch (error) {
    console.error('❌ Error creando usuarios de prueba:', error);
  }
}

populateTestUsers();