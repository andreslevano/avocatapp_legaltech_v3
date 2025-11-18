/**
 * Script to resend invitation emails to users that were created but didn't receive emails
 * This script reads the results from user-creation-results.json and resends emails
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/resend-invitation-emails.ts
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local explicitly
const envPath = path.resolve(__dirname, '../env.local');
dotenv.config({ path: envPath });
console.log('📋 Loading env from:', envPath);

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as nodemailer from 'nodemailer';
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

const auth = getAuth();

// Initialize Nodemailer
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ ERROR: EMAIL_USER y EMAIL_PASS deben estar configurados en .env.local');
  process.exit(1);
}

// Initialize Nodemailer
// Use explicit SMTP configuration matching Firebase SMTP settings
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

async function resendInvitationEmails() {
  try {
    console.log('\n📧 Reenviando emails de invitación...\n');
    
    // Read results file
    const resultsPath = path.resolve(__dirname, '../old_users/user-creation-results.json');
    if (!fs.existsSync(resultsPath)) {
      console.error(`❌ Archivo de resultados no encontrado: ${resultsPath}`);
      console.error('   Ejecuta primero: scripts/create-users-and-send-invitations.ts');
      process.exit(1);
    }
    
    const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    const usersToResend = resultsData.results.filter((r: any) => r.success && !r.emailSent);
    
    console.log(`📊 Usuarios que necesitan reenvío: ${usersToResend.length}\n`);
    
    if (usersToResend.length === 0) {
      console.log('✅ Todos los usuarios ya recibieron sus emails');
      process.exit(0);
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < usersToResend.length; i++) {
      const user = usersToResend[i];
      console.log(`[${i + 1}/${usersToResend.length}] Reenviando a: ${user.email}`);
      
      try {
        // Get user from Auth to get display name
        const authUser = await auth.getUserByEmail(user.email);
        const displayName = authUser.displayName || user.email.split('@')[0];
        
        // Get user document from Firestore to get area legal
        const { getFirestore } = await import('firebase-admin/firestore');
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(authUser.uid).get();
        const userData = userDoc.data();
        const areaLegal = userData?.areaLegal || null;
        
        // Generate invitation link
        const invitationLink = await auth.generatePasswordResetLink(user.email, {
          url: process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com/reset-password?mode=setPassword',
          handleCodeInApp: true,
        });
        
        // Send email
        const emailHtml = generateEmailHTML(displayName, invitationLink, areaLegal);
        
        await transporter.sendMail({
          from: `"Avocat LegalTech" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Bienvenido a la Nueva Versión de Avocat LegalTech - Establece tu Contraseña',
          html: emailHtml,
        });
        
        console.log(`   ✅ Email enviado exitosamente`);
        successCount++;
        
        // Rate limiting: wait 1 second between emails
        if (i < usersToResend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Total usuarios procesados: ${usersToResend.length}`);
    console.log(`✅ Emails enviados: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}\n`);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    throw error;
  }
}

// Main execution
resendInvitationEmails()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });

