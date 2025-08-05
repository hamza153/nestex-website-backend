const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  try {
    console.log('🚀 Testing Nestex Backend API with PayU Integration\n');

    // Test health endpoint
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test QR code generation
    console.log('2. Testing QR Code Generation...');
    const qrResponse = await axios.post(`${BASE_URL}/api/payu/generate-qr`, {
      amount: 150.50,
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '9876543210'
    });
    
    console.log('✅ QR Code Generated Successfully!');
    console.log('📊 Transaction ID:', qrResponse.data.data.transactionId);
    console.log('💰 Amount:', qrResponse.data.data.amount);
    console.log('👤 Customer:', qrResponse.data.data.customerName);
    console.log('📧 Email:', qrResponse.data.data.customerEmail);
    console.log('📱 Phone:', qrResponse.data.data.customerPhone);
    console.log('🔗 Payment URL:', qrResponse.data.data.paymentUrl);
    console.log('📱 QR Code Data URL Length:', qrResponse.data.data.qrCodeDataUrl.length, 'characters');
    console.log('');

    // Test payment verification
    console.log('3. Testing Payment Verification...');
    const verifyResponse = await axios.post(`${BASE_URL}/api/payu/verify-payment`, {
      txnid: qrResponse.data.data.transactionId
    });
    
    console.log('✅ Payment Verification:', verifyResponse.data.data);
    console.log('');

    // Test payment status endpoint
    console.log('4. Testing Payment Status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/payu/payment-status/${qrResponse.data.data.transactionId}`);
    console.log('✅ Payment Status:', statusResponse.data.data);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 API Endpoints Summary:');
    console.log('   • GET  /health - Health check');
    console.log('   • POST /api/payu/generate-qr - Generate QR code');
    console.log('   • POST /api/payu/verify-payment - Verify payment');
    console.log('   • GET  /api/payu/payment-status/:txnid - Get payment status');
    console.log('   • POST /api/payu/webhook - PayU webhook handler');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAPI(); 