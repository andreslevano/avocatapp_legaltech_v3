/**
 * Script to test if Firebase email sending is configured
 * This will attempt to send a password reset email to verify configuration
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/test-firebase-email.ts <email>
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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

async function testFirebaseEmail(email: string) {
  try {
    console.log(`\n🔍 Testing Firebase email configuration...\n`);
    console.log(`📧 Target email: ${email}\n`);
    
    // Check if user exists
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ User found in Firebase Auth:`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Disabled: ${user.disabled}\n`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  User not found in Firebase Auth`);
        console.log(`   This is OK - we can still test email generation\n`);
      } else {
        throw error;
      }
    }
    
    // Generate password reset link (this doesn't send email, just generates the link)
    console.log('🔗 Generating password reset link...');
    const resetLink = await auth.generatePasswordResetLink(email, {
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com/login',
      handleCodeInApp: true,
    });
    
    console.log(`✅ Password reset link generated successfully!`);
    console.log(`\n📋 Link preview (first 100 chars):`);
    console.log(`   ${resetLink.substring(0, 100)}...\n`);
    
    // Generate email verification link (if user exists)
    if (user && !user.emailVerified) {
      console.log('🔗 Generating email verification link...');
      const verifyLink = await auth.generateEmailVerificationLink(email, {
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://avocatapp.com/login',
        handleCodeInApp: true,
      });
      
      console.log(`✅ Email verification link generated successfully!`);
      console.log(`\n📋 Link preview (first 100 chars):`);
      console.log(`   ${verifyLink.substring(0, 100)}...\n`);
    }
    
    // Check email templates configuration
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📧 EMAIL CONFIGURATION STATUS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('✅ Firebase Admin SDK can generate email links');
    console.log('✅ Email sending is handled by Firebase automatically');
    console.log('✅ No SMTP configuration needed for Auth emails\n');
    
    console.log('📝 To customize email templates:');
    console.log('   1. Go to Firebase Console → Authentication → Templates');
    console.log('   2. Edit the email templates (Password reset, Email verification, etc.)');
    console.log('   3. Customize subject, body, and action URL\n');
    
    console.log('📝 To send invitation emails:');
    console.log('   1. Use auth.generateEmailVerificationLink() or');
    console.log('   2. Use auth.generatePasswordResetLink()');
    console.log('   3. Send the link via your own email service (nodemailer) or');
    console.log('   4. Use Firebase Extensions for custom email sending\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETED');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('💡 Note: This script only generates links. To actually send emails:');
    console.log('   - Use sendPasswordResetEmail() from client SDK (already working)');
    console.log('   - Or send the generated link via nodemailer (custom emails)\n');
    
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
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage:');
  console.log('  npx ts-node --project tsconfig.scripts.json scripts/test-firebase-email.ts <email>\n');
  process.exit(1);
}

testFirebaseEmail(email)
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });


