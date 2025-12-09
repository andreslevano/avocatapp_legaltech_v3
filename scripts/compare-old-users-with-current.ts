/**
 * Script to compare users from Excel Hoja 2 with current Firebase Auth/Firestore users
 * Shows which users exist, which are missing, and provides detailed comparison
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/compare-old-users-with-current.ts
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || "avocat-legaltech-v3",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    console.log('✅ Firebase Admin initialized');
  } else {
    initializeApp({
      projectId: "avocat-legaltech-v3",
    });
    console.log('⚠️ Firebase Admin initialized with default credentials');
  }
}

const db = getFirestore();
const auth = getAuth();

interface OldUser {
  email: string;
  nombres: string;
  primer_apellido: string;
  pais: string;
  area_legal: string;
}

interface ComparisonResult {
  email: string;
  inExcel: boolean;
  inAuth: boolean;
  inFirestore: boolean;
  authUid?: string;
  firestoreUid?: string;
  excelData?: OldUser;
  authData?: any;
  firestoreData?: any;
}

async function compareOldUsersWithCurrent() {
  try {
    console.log('\n🔍 Comparing old users (Hoja 2) with current Firebase users...\n');
    
    // Read Excel file - Hoja 2 only
    const excelFilePath = path.resolve(__dirname, '../old_users/Usuario version antigua.xlsx');
    console.log('📖 Reading Excel file...');
    
    if (!fs.existsSync(excelFilePath)) {
      console.error(`❌ File not found: ${excelFilePath}`);
      process.exit(1);
    }
    
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = 'Hoja 2';
    
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`❌ Sheet "${sheetName}" not found in Excel file`);
      process.exit(1);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: ''
    }) as any[];
    
    // Process Excel data
    const oldUsers: OldUser[] = jsonData.map(row => ({
      email: (row['Document ID'] || '').trim().toLowerCase(),
      nombres: (row['nombres'] || '').replace(/"/g, '').trim(),
      primer_apellido: (row['primer_apellido'] || '').replace(/"/g, '').trim(),
      pais: (row['pais'] || '').replace(/"/g, '').trim(),
      area_legal: (row['area_legal'] || '').replace(/"/g, '').trim()
    })).filter(user => user.email); // Filter out empty emails
    
    console.log(`✅ Found ${oldUsers.length} users in Excel (Hoja 2)\n`);
    
    // Get current Firebase Auth users
    console.log('📋 Fetching current Firebase Auth users...');
    const authUsers = await auth.listUsers();
    const authUsersByEmail = new Map<string, any>();
    authUsers.users.forEach(user => {
      if (user.email) {
        authUsersByEmail.set(user.email.toLowerCase(), user);
      }
    });
    console.log(`✅ Found ${authUsers.users.length} users in Firebase Auth\n`);
    
    // Get current Firestore users
    console.log('📋 Fetching current Firestore users...');
    const firestoreUsersSnapshot = await db.collection('users').get();
    const firestoreUsersByEmail = new Map<string, any>();
    firestoreUsersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      if (userData.email) {
        firestoreUsersByEmail.set(userData.email.toLowerCase(), {
          uid: doc.id,
          ...userData
        });
      }
    });
    console.log(`✅ Found ${firestoreUsersSnapshot.docs.length} users in Firestore\n`);
    
    // Compare
    console.log('🔍 Comparing users...\n');
    
    const comparisonResults: ComparisonResult[] = [];
    const excelEmails = new Set<string>();
    
    // Process each old user
    for (const oldUser of oldUsers) {
      const emailLower = oldUser.email.toLowerCase();
      excelEmails.add(emailLower);
      
      const authUser = authUsersByEmail.get(emailLower);
      const firestoreUser = firestoreUsersByEmail.get(emailLower);
      
      comparisonResults.push({
        email: oldUser.email,
        inExcel: true,
        inAuth: !!authUser,
        inFirestore: !!firestoreUser,
        authUid: authUser?.uid,
        firestoreUid: firestoreUser?.uid,
        excelData: oldUser,
        authData: authUser ? {
          uid: authUser.uid,
          displayName: authUser.displayName,
          disabled: authUser.disabled,
          createdAt: authUser.metadata.creationTime,
          lastSignIn: authUser.metadata.lastSignInTime
        } : undefined,
        firestoreData: firestoreUser ? {
          uid: firestoreUser.uid,
          displayName: firestoreUser.displayName,
          isActive: firestoreUser.isActive,
          isAdmin: firestoreUser.isAdmin,
          plan: firestoreUser.plan,
          country: firestoreUser.country
        } : undefined
      });
    }
    
    // Find users in Auth/Firestore but not in Excel
    const usersOnlyInAuth: any[] = [];
    const usersOnlyInFirestore: any[] = [];
    
    authUsers.users.forEach(user => {
      if (user.email && !excelEmails.has(user.email.toLowerCase())) {
        usersOnlyInAuth.push(user);
      }
    });
    
    firestoreUsersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      if (userData.email && !excelEmails.has(userData.email.toLowerCase())) {
        usersOnlyInFirestore.push({
          uid: doc.id,
          ...userData
        });
      }
    });
    
    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 COMPARISON SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const inBoth = comparisonResults.filter(r => r.inAuth && r.inFirestore).length;
    const inAuthOnly = comparisonResults.filter(r => r.inAuth && !r.inFirestore).length;
    const inFirestoreOnly = comparisonResults.filter(r => !r.inAuth && r.inFirestore).length;
    const inNeither = comparisonResults.filter(r => !r.inAuth && !r.inFirestore).length;
    
    console.log(`Total users in Excel (Hoja 2): ${oldUsers.length}`);
    console.log(`Total users in Firebase Auth: ${authUsers.users.length}`);
    console.log(`Total users in Firestore: ${firestoreUsersSnapshot.docs.length}\n`);
    
    console.log('📊 Comparison Results:\n');
    console.log(`   ✅ In Excel, Auth, AND Firestore: ${inBoth}`);
    console.log(`   ⚠️  In Excel and Auth (but NOT Firestore): ${inAuthOnly}`);
    console.log(`   ⚠️  In Excel and Firestore (but NOT Auth): ${inFirestoreOnly}`);
    console.log(`   ❌ In Excel but NOT in Auth or Firestore: ${inNeither}\n`);
    
    // Users missing from both Auth and Firestore
    if (inNeither > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('❌ USERS IN EXCEL BUT NOT IN AUTH OR FIRESTORE');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`Found ${inNeither} user(s) that need to be created:\n`);
      
      const missingUsers = comparisonResults.filter(r => !r.inAuth && !r.inFirestore);
      console.log('┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Email                                      │ Nombre              │ Apellido          │ País       │ Área Legal        │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');
      
      missingUsers.forEach(user => {
        const email = (user.email || '').padEnd(42);
        const nombres = (user.excelData?.nombres || 'N/A').padEnd(20);
        const apellido = (user.excelData?.primer_apellido || 'N/A').padEnd(18);
        const pais = (user.excelData?.pais || 'N/A').padEnd(11);
        const area = (user.excelData?.area_legal || 'N/A').padEnd(17);
        console.log(`│ ${email} │ ${nombres} │ ${apellido} │ ${pais} │ ${area} │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');
      
      // Detailed list
      console.log('📋 Detailed list of missing users:\n');
      missingUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Nombre: ${user.excelData?.nombres || 'N/A'}`);
        console.log(`   Apellido: ${user.excelData?.primer_apellido || 'N/A'}`);
        console.log(`   País: ${user.excelData?.pais || 'N/A'}`);
        console.log(`   Área Legal: ${user.excelData?.area_legal || 'N/A'}`);
        console.log('');
      });
    }
    
    // Users in Auth but not Firestore
    if (inAuthOnly > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('⚠️  USERS IN EXCEL AND AUTH BUT NOT IN FIRESTORE');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      const authOnlyUsers = comparisonResults.filter(r => r.inAuth && !r.inFirestore);
      authOnlyUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Auth UID: ${user.authUid}`);
        console.log(`   Excel Data: ${user.excelData?.nombres} ${user.excelData?.primer_apellido} (${user.excelData?.pais})`);
        console.log(`   Status: Needs Firestore document creation`);
        console.log('');
      });
    }
    
    // Users in Firestore but not Auth
    if (inFirestoreOnly > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('⚠️  USERS IN EXCEL AND FIRESTORE BUT NOT IN AUTH');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      const firestoreOnlyUsers = comparisonResults.filter(r => !r.inAuth && r.inFirestore);
      firestoreOnlyUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Firestore UID: ${user.firestoreUid}`);
        console.log(`   Excel Data: ${user.excelData?.nombres} ${user.excelData?.primer_apellido} (${user.excelData?.pais})`);
        console.log(`   Status: Orphaned Firestore document (user deleted from Auth)`);
        console.log('');
      });
    }
    
    // Users in both (complete)
    if (inBoth > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('✅ USERS IN EXCEL, AUTH, AND FIRESTORE (COMPLETE)');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`Found ${inBoth} user(s) that exist in all three places.\n`);
    }
    
    // Users only in Auth/Firestore (not in Excel)
    if (usersOnlyInAuth.length > 0 || usersOnlyInFirestore.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('ℹ️  USERS IN AUTH/FIRESTORE BUT NOT IN EXCEL');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`Users in Auth but not in Excel: ${usersOnlyInAuth.length}`);
      console.log(`Users in Firestore but not in Excel: ${usersOnlyInFirestore.length}`);
      console.log('(These are new users created after the Excel export)\n');
    }
    
    // Export detailed comparison to JSON
    const outputPath = path.resolve(__dirname, '../old_users/comparison-results.json');
    const exportData = {
      summary: {
        totalInExcel: oldUsers.length,
        totalInAuth: authUsers.users.length,
        totalInFirestore: firestoreUsersSnapshot.docs.length,
        inAllThree: inBoth,
        inExcelAndAuthOnly: inAuthOnly,
        inExcelAndFirestoreOnly: inFirestoreOnly,
        inExcelButNotInAuthOrFirestore: inNeither
      },
      missingUsers: comparisonResults
        .filter(r => !r.inAuth && !r.inFirestore)
        .map(r => ({
          email: r.email,
          nombres: r.excelData?.nombres,
          primer_apellido: r.excelData?.primer_apellido,
          pais: r.excelData?.pais,
          area_legal: r.excelData?.area_legal
        })),
      allComparisons: comparisonResults.map(r => ({
        email: r.email,
        inAuth: r.inAuth,
        inFirestore: r.inFirestore,
        authUid: r.authUid,
        firestoreUid: r.firestoreUid,
        excelData: r.excelData
      }))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💾 Detailed comparison exported to JSON');
    console.log(`   File: ${outputPath}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    throw error;
  }
}

// Main execution
compareOldUsersWithCurrent()
  .then(() => {
    console.log('✅ Comparison completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Comparison failed:', error);
    process.exit(1);
  });


