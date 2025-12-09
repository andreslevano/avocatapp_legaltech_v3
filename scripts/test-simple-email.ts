/**
 * Simple test to verify email credentials
 * Tests just the connection without sending emails
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import * as nodemailer from 'nodemailer';

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log('\n🔍 Testing Email Connection...\n');
console.log('EMAIL_USER:', emailUser);
console.log('EMAIL_PASS length:', emailPass?.length || 0);
console.log('EMAIL_PASS (first 4 chars):', emailPass?.substring(0, 4));
console.log('EMAIL_PASS (last 4 chars):', emailPass?.substring(emailPass.length - 4));
console.log('');

if (!emailUser || !emailPass) {
  console.error('❌ EMAIL_USER o EMAIL_PASS no están configurados');
  process.exit(1);
}

// Test connection with explicit SMTP config (matching Firebase SMTP settings)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

console.log('🧪 Testing connection...\n');

transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Connection failed:');
    console.log('   Error:', error.message);
    console.log('   Code:', (error as any).code || 'N/A');
    console.log('\n💡 Posibles soluciones:');
    console.log('   1. Verifica que la contraseña de aplicación sea correcta');
    console.log('   2. Verifica que la verificación en 2 pasos esté activada');
    console.log('   3. Verifica que no haya actividad sospechosa bloqueada en Google');
    console.log('   4. Intenta generar una nueva contraseña de aplicación');
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('   Server is ready to send emails');
    console.log('\n💡 La configuración funciona. El problema puede ser:');
    console.log('   - Rate limiting de Google (demasiados intentos)');
    console.log('   - Bloqueo temporal por actividad sospechosa');
    console.log('   - Necesitas esperar unos minutos antes de intentar de nuevo');
    process.exit(0);
  }
});

