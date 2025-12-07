/**
 * Script to test email credentials with Nodemailer
 * This will help diagnose why the app password works in Firebase but not in Nodemailer
 * 
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/test-email-credentials.ts
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import * as nodemailer from 'nodemailer';

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log('\n🔍 Testing Email Credentials...\n');
console.log('EMAIL_USER:', emailUser);
console.log('EMAIL_PASS:', emailPass ? `${emailPass.substring(0, 4)}...${emailPass.substring(emailPass.length - 4)}` : 'NOT SET');
console.log('EMAIL_PASS length:', emailPass?.length || 0);
console.log('EMAIL_PASS (with spaces):', emailPass);
console.log('EMAIL_PASS (without spaces):', emailPass?.replace(/\s/g, ''));
console.log('');

if (!emailUser || !emailPass) {
  console.error('❌ EMAIL_USER o EMAIL_PASS no están configurados');
  process.exit(1);
}

// Test different configurations
const configs = [
  {
    name: 'Config 1: service gmail (sin espacios)',
    config: {
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass.replace(/\s/g, ''),
      },
    }
  },
  {
    name: 'Config 2: service gmail (con espacios)',
    config: {
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    }
  },
  {
    name: 'Config 3: SMTP explícito (sin espacios)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass.replace(/\s/g, ''),
      },
    }
  },
  {
    name: 'Config 4: SMTP explícito (con espacios)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    }
  },
  {
    name: 'Config 5: SMTP con STARTTLS (sin espacios)',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: emailUser,
        pass: emailPass.replace(/\s/g, ''),
      },
    }
  },
];

async function testConfig(name: string, config: any) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const transporter = nodemailer.createTransport(config);
    
    // Verify connection
    await transporter.verify();
    console.log(`   ✅ Connection successful!`);
    
    // Try sending a test email
    const info = await transporter.sendMail({
      from: `"Test" <${emailUser}>`,
      to: emailUser, // Send to self
      subject: 'Test Email from Nodemailer',
      text: 'This is a test email to verify credentials work.',
      html: '<p>This is a test email to verify credentials work.</p>',
    });
    
    console.log(`   ✅ Test email sent! Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.code) {
      console.log(`      Code: ${error.code}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📧 EMAIL CREDENTIALS TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  for (const { name, config } of configs) {
    const success = await testConfig(name, config);
    if (success) {
      console.log(`\n✅ SUCCESS! Working configuration: ${name}`);
      console.log('\nUse this configuration in your scripts:\n');
      console.log(JSON.stringify(config, null, 2));
      break;
    }
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETED');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

