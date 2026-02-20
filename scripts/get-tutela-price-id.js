/**
 * Script to retrieve the Price ID for the Acción de Tutela product
 * Usage: node scripts/get-tutela-price-id.js
 */

const Stripe = require('stripe');

async function getTutelaPriceId() {
  // Get Stripe secret key from environment or prompt
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
    console.log('Please set it: export STRIPE_SECRET_KEY=sk_...');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  });

  const productId = 'prod_TGmzPkQZNAIDYv'; // Product ID from Stripe Dashboard

  try {
    console.log(`🔍 Retrieving prices for product: ${productId}...`);
    
    // List all prices for this product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 10,
    });

    if (prices.data.length === 0) {
      console.error('❌ No prices found for this product');
      process.exit(1);
    }

    console.log('\n✅ Found prices:');
    console.log('─'.repeat(60));
    
    prices.data.forEach((price, index) => {
      const amount = price.unit_amount;
      const currency = price.currency.toUpperCase();
      const formattedAmount = currency === 'COP' 
        ? `${amount.toLocaleString()} ${currency}` 
        : `${(amount / 100).toFixed(2)} ${currency}`;
      
      console.log(`\n${index + 1}. Price ID: ${price.id}`);
      console.log(`   Amount: ${formattedAmount}`);
      console.log(`   Currency: ${currency}`);
      console.log(`   Type: ${price.type}`);
      console.log(`   Active: ${price.active}`);
    });

    // Find the COP price
    const copPrice = prices.data.find(p => p.currency.toLowerCase() === 'cop');
    
    if (copPrice) {
      console.log('\n🎯 Colombian Peso (COP) Price Found:');
      console.log('─'.repeat(60));
      console.log(`Price ID: ${copPrice.id}`);
      console.log(`Amount: ${copPrice.unit_amount.toLocaleString()} COP`);
      console.log('\n📋 To set this as an environment variable:');
      console.log(`firebase functions:secrets:set STRIPE_PRICE_ID_TUTELA`);
      console.log(`# Then paste: ${copPrice.id}`);
    } else {
      console.log('\n⚠️  No COP price found. Available currencies:');
      prices.data.forEach(p => {
        console.log(`   - ${p.currency.toUpperCase()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error retrieving prices:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('   Check that your STRIPE_SECRET_KEY is correct');
    }
    process.exit(1);
  }
}

getTutelaPriceId();
