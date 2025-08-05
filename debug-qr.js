require('dotenv').config();
const PayUService = require('./services/payuService');

async function debugQR() {
  try {
    console.log('🔍 Debugging QR Generation...');
    
    const payuService = new PayUService();
    
    console.log('Environment variables:');
    console.log('PAYU_MERCHANT_KEY:', process.env.PAYU_MERCHANT_KEY);
    console.log('PAYU_MERCHANT_SALT:', process.env.PAYU_MERCHANT_SALT);
    console.log('PAYU_MODE:', process.env.PAYU_MODE);
    console.log('PAYU_BASE_URL:', process.env.PAYU_BASE_URL);
    
    console.log('\nTesting QR generation...');
    
    const result = await payuService.generateQRCode({
      customerId: 'CUST_123',
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      customerPhone: '9999999999',
      amount: 100
    });
    
    console.log('✅ QR Generation successful:', result);
    
  } catch (error) {
    console.error('❌ QR Generation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugQR(); 