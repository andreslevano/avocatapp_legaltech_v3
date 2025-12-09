/**
 * Script to create 75 missing users from Excel (Hoja 2) in Firebase Auth and Firestore
 * and send personalized invitation emails with commercial content about new Avocat version
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/create-users-and-send-invitations.ts
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
import * as nodemailer from 'nodemailer';

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

// Initialize Nodemailer
// Try both with and without spaces, as Firebase SMTP might handle it differently
const emailPass = process.env.EMAIL_PASS || '';
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: emailPass, // Keep original format (with or without spaces)
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify email configuration
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ ERROR: EMAIL_USER y EMAIL_PASS deben estar configurados en .env.local');
  console.error('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ Configurado' : '❌ Faltante');
  console.error('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Configurado' : '❌ Faltante');
  process.exit(1);
}

interface OldUser {
  email: string;
  nombres: string;
  primer_apellido: string;
  pais: string;
  area_legal: string;
}

interface UserCreationResult {
  email: string;
  success: boolean;
  uid?: string;
  error?: string;
  emailSent?: boolean;
  emailError?: string;
}

function generateEmailHTML(displayName: string, invitationLink: string, areaLegal?: string): string {
  const nombreSaludo = displayName || 'Estimado/a profesional';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background-color: #f59e0b; color: white; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Avocat LegalTech</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Plataforma LegalTech Inteligente</p>
    </div>
    
    <!-- Contenido Principal -->
    <div style="padding: 40px 30px; background-color: #f9fafb;">
      
      <!-- Saludo Personalizado -->
      <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 24px;">
        ¡Bienvenido a la Nueva Versión de Avocat LegalTech!
      </h2>
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
        Hola <strong>${nombreSaludo}</strong>,
      </p>
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
        Nos complace informarte que hemos lanzado una <strong>nueva versión mejorada</strong> de Avocat LegalTech, 
        diseñada específicamente para revolucionar tu práctica legal con herramientas de inteligencia artificial 
        y automatización de última generación.
      </p>
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
        Esta migración a nuestra nueva plataforma te brinda acceso a funcionalidades avanzadas que te permitirán 
        optimizar tu trabajo, ahorrar tiempo valioso y ofrecer un servicio excepcional a tus clientes.
      </p>
      
      <!-- Nuevos Productos y Funcionalidades -->
      <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">
          🚀 ¿Qué hay de nuevo en Avocat LegalTech?
        </h3>
        <ul style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Generación Inteligente de Documentos:</strong> Crea documentos legales profesionales en minutos usando IA avanzada</li>
          <li><strong>Reclamación de Cantidades:</strong> Genera automáticamente reclamaciones laborales completas y precisas</li>
          <li><strong>Acción de Tutela:</strong> Herramienta especializada para acciones de tutela con plantillas optimizadas</li>
          <li><strong>Análisis de Documentos con IA:</strong> Analiza y resume documentos legales complejos en segundos</li>
          <li><strong>Gestión Integral de Casos:</strong> Organiza y gestiona todos tus casos desde un solo lugar</li>
          <li><strong>Plantillas Profesionales:</strong> Accede a cientos de plantillas legales actualizadas por área de práctica</li>
        </ul>
      </div>
      
      <!-- Beneficios Comerciales -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">
          💼 Beneficios para tu Práctica Legal
        </h3>
        <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Ahorra hasta 80% de tiempo</strong> en la creación de documentos legales</li>
          <li><strong>Reduce errores</strong> con validación automática y plantillas probadas</li>
          <li><strong>Aumenta tu productividad</strong> permitiéndote atender más casos</li>
          <li><strong>Mejora la calidad</strong> de tus documentos con estándares profesionales</li>
          <li><strong>Competitividad:</strong> Mantente a la vanguardia con tecnología legal de punta</li>
        </ul>
      </div>
      
      ${areaLegal ? `
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 30px 0; border-radius: 4px;">
        <p style="color: #065f46; margin: 0; font-size: 14px; line-height: 1.6;">
          <strong>💡 Especialización:</strong> Como profesional en <strong>${areaLegal}</strong>, encontrarás herramientas 
          específicas diseñadas para optimizar tu área de práctica.
        </p>
      </div>
      ` : ''}
      
      <p style="color: #6b7280; line-height: 1.6; margin-bottom: 30px; font-size: 16px;">
        Para comenzar a disfrutar de todas estas nuevas funcionalidades, necesitamos que establezcas tu contraseña 
        en nuestra nueva plataforma. Haz clic en el botón siguiente para completar tu registro:
      </p>
      
      <!-- Botón de Acción -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" 
           style="display: inline-block; background-color: #f59e0b; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Establecer Contraseña y Acceder
        </a>
      </div>
      
      <!-- Link Alternativo -->
      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 20px;">
        O copia y pega este enlace en tu navegador:<br>
        <a href="${invitationLink}" style="color: #3b82f6; word-break: break-all; font-size: 12px;">${invitationLink}</a>
      </p>
      
      <!-- Información de Seguridad -->
      <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 30px 0; border-radius: 4px;">
        <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">
          <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por seguridad. 
          Si no puedes acceder, puedes solicitar un nuevo enlace desde la página de inicio de sesión.
        </p>
      </div>
      
      <!-- Cierre -->
      <p style="color: #6b7280; line-height: 1.6; margin-top: 30px; font-size: 16px;">
        Estamos emocionados de tenerte como parte de nuestra comunidad de profesionales legales que están 
        transformando su práctica con tecnología de vanguardia.
      </p>
      
      <p style="color: #6b7280; line-height: 1.6; margin-top: 20px; font-size: 16px;">
        Si tienes alguna pregunta o necesitas ayuda, nuestro equipo está disponible en 
        <a href="mailto:soporte@avocatapp.com" style="color: #3b82f6;">soporte@avocatapp.com</a>
      </p>
      
      <p style="color: #6b7280; line-height: 1.6; margin-top: 20px; font-size: 16px;">
        Atentamente,<br>
        <strong>Equipo Avocat LegalTech</strong>
      </p>
      
    </div>
    
    <!-- Footer -->
    <div style="background-color: #374151; color: #9ca3af; padding: 25px 30px; text-align: center; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">
        © 2024 Avocat LegalTech. Todos los derechos reservados.
      </p>
      <p style="margin: 0;">
        Este es un email automático relacionado con la migración a nuestra nueva plataforma.
      </p>
      <p style="margin: 10px 0 0 0;">
        <a href="https://avocatapp.com" style="color: #9ca3af; text-decoration: underline;">Visita nuestro sitio web</a>
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

async function createUserAndSendInvitation(user: OldUser): Promise<UserCreationResult> {
  const result: UserCreationResult = {
    email: user.email,
    success: false,
  };

  try {
    // Validate email
    if (!user.email || !user.email.includes('@')) {
      result.error = 'Email inválido';
      return result;
    }

    // Generate display name
    const displayName = user.nombres && user.primer_apellido
      ? `${user.nombres} ${user.primer_apellido}`.trim()
      : user.nombres
        ? user.nombres.trim()
        : user.email.split('@')[0];

    // Check if user already exists
    let authUser;
    try {
      authUser = await auth.getUserByEmail(user.email);
      console.log(`   ⚠️  Usuario ya existe en Auth: ${user.email}`);
      result.uid = authUser.uid;
      result.success = true; // User exists, consider it success
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        authUser = await auth.createUser({
          email: user.email,
          displayName: displayName,
          emailVerified: false,
          disabled: false,
        });
        console.log(`   ✅ Usuario creado en Auth: ${authUser.uid}`);
        result.uid = authUser.uid;
        result.success = true;
      } else {
        throw error;
      }
    }

    // Create or update Firestore document
    const userDocRef = db.collection('users').doc(authUser.uid);
    const userDoc = await userDocRef.get();

    const userData: any = {
      uid: authUser.uid,
      email: user.email,
      displayName: displayName,
      firstName: user.nombres || null,
      lastName: user.primer_apellido || null,
      country: user.pais || null,
      areaLegal: user.area_legal || null,
      isAdmin: false,
      isActive: true,
      role: 'user',
      createdAt: authUser.metadata.creationTime || new Date().toISOString(),
      lastLoginAt: authUser.metadata.lastSignInTime || authUser.metadata.creationTime || new Date().toISOString(),
      subscription: {
        plan: 'free',
        startDate: authUser.metadata.creationTime || new Date().toISOString(),
        isActive: true
      },
      preferences: {
        language: 'es',
        notifications: true,
        theme: 'light'
      },
      stats: {
        totalDocuments: 0,
        totalGenerations: 0,
        totalSpent: 0
      }
    };

    if (userDoc.exists) {
      await userDocRef.update(userData);
      console.log(`   ✅ Documento actualizado en Firestore`);
    } else {
      await userDocRef.set(userData);
      console.log(`   ✅ Documento creado en Firestore`);
    }

    // Generate invitation link
    const invitationLink = await auth.generatePasswordResetLink(user.email, {
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com/reset-password?mode=setPassword',
      handleCodeInApp: true,
    });

    // Send email
    try {
      const emailHtml = generateEmailHTML(displayName, invitationLink, user.area_legal);
      
      await transporter.sendMail({
        from: `"Avocat LegalTech" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Bienvenido a la Nueva Versión de Avocat LegalTech - Establece tu Contraseña',
        html: emailHtml,
      });

      console.log(`   ✅ Email enviado exitosamente`);
      result.emailSent = true;
    } catch (emailError: any) {
      console.error(`   ❌ Error enviando email:`, emailError.message);
      result.emailSent = false;
      result.emailError = emailError.message;
      // Don't fail the whole process if email fails
    }

  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
    result.error = error.message;
    result.success = false;
  }

  return result;
}

async function createUsersAndSendInvitations() {
  try {
    console.log('\n🚀 Iniciando creación de usuarios e invitaciones...\n');
    
    // Read Excel file - Hoja 2 only
    const excelFilePath = path.resolve(__dirname, '../old_users/Usuario version antigua.xlsx');
    console.log('📖 Leyendo archivo Excel...');
    
    if (!fs.existsSync(excelFilePath)) {
      console.error(`❌ Archivo no encontrado: ${excelFilePath}`);
      process.exit(1);
    }
    
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = 'Hoja 2';
    
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`❌ Hoja "${sheetName}" no encontrada en el archivo Excel`);
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
    
    console.log(`✅ Encontrados ${oldUsers.length} usuarios en Excel (Hoja 2)\n`);
    
    // Get existing users to skip
    const existingAuthUsers = await auth.listUsers();
    const existingEmails = new Set(existingAuthUsers.users.map(u => u.email?.toLowerCase()).filter(Boolean));
    
    const usersToCreate = oldUsers.filter(user => !existingEmails.has(user.email.toLowerCase()));
    console.log(`📊 Usuarios a procesar: ${usersToCreate.length}`);
    console.log(`   (${oldUsers.length - usersToCreate.length} ya existen y serán actualizados)\n`);
    
    // Process users
    const results: UserCreationResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    let emailSentCount = 0;
    let emailErrorCount = 0;
    
    for (let i = 0; i < oldUsers.length; i++) {
      const user = oldUsers[i];
      console.log(`\n[${i + 1}/${oldUsers.length}] Procesando: ${user.email}`);
      
      const result = await createUserAndSendInvitation(user);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      if (result.emailSent) {
        emailSentCount++;
      } else if (result.emailError) {
        emailErrorCount++;
      }
      
      // Rate limiting: wait 1 second between emails to avoid hitting Gmail limits
      if (i < oldUsers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`Total usuarios procesados: ${oldUsers.length}`);
    console.log(`✅ Usuarios creados/actualizados exitosamente: ${successCount}`);
    console.log(`❌ Errores en creación: ${errorCount}`);
    console.log(`📧 Emails enviados: ${emailSentCount}`);
    console.log(`⚠️  Errores en envío de emails: ${emailErrorCount}\n`);
    
    // Export results
    const resultsPath = path.resolve(__dirname, '../old_users/user-creation-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      summary: {
        total: oldUsers.length,
        success: successCount,
        errors: errorCount,
        emailsSent: emailSentCount,
        emailErrors: emailErrorCount
      },
      results: results
    }, null, 2), 'utf-8');
    
    console.log(`💾 Resultados exportados a: ${resultsPath}\n`);
    
    // List errors if any
    const errors = results.filter(r => !r.success || r.emailError);
    if (errors.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('⚠️  USUARIOS CON ERRORES');
      console.log('═══════════════════════════════════════════════════════════════\n');
      errors.forEach(err => {
        console.log(`- ${err.email}`);
        if (err.error) console.log(`  Error: ${err.error}`);
        if (err.emailError) console.log(`  Email Error: ${err.emailError}`);
      });
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO');
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
createUsersAndSendInvitations()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });

