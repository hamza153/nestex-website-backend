const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testPayUIntegration() {
  try {
    console.log('🚀 Testing Complete PayU.in Integration\n');

    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: Generate QR Code
    console.log('2. Testing QR Code Generation...');
    const qrResponse = await axios.post(`${BASE_URL}/api/payu/generate-qr`, {
      amount: 100.50,
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerPhone: '9876543210'
    });
    
    console.log('✅ QR Code Generated Successfully!');
    console.log('📊 Transaction ID:', qrResponse.data.data.transactionId);
    console.log('💰 Amount:', qrResponse.data.data.amount);
    console.log('👤 Customer:', qrResponse.data.data.customerName);
    console.log('🔗 Payment URL:', qrResponse.data.data.paymentUrl);
    console.log('📱 QR Payment URL:', qrResponse.data.data.qrPaymentUrl);
    console.log('📱 QR Code Data URL Length:', qrResponse.data.data.qrCodeDataUrl.length, 'characters');
    console.log('');

    const transactionId = qrResponse.data.data.transactionId;

    // Test 3: Create Payment Form
    console.log('3. Testing Payment Form Creation...');
    const formResponse = await axios.post(`${BASE_URL}/api/payu/create-form`, {
      amount: 75.25,
      customerName: 'Jane Smith',
      customerEmail: 'jane.smith@example.com',
      customerPhone: '8765432109'
    });
    
    console.log('✅ Payment Form Created Successfully!');
    console.log('📊 Transaction ID:', formResponse.data.data.transactionId);
    console.log('💰 Amount:', formResponse.data.data.amount);
    console.log('📝 Form HTML Length:', formResponse.data.data.paymentForm.length, 'characters');
    console.log('');

    // Test 4: Verify Payment (will show error if no real payment made)
    console.log('4. Testing Payment Verification...');
    try {
      const verifyResponse = await axios.post(`${BASE_URL}/api/payu/verify-payment`, {
        txnid: transactionId
      });
      
      console.log('✅ Payment Verification Response:', verifyResponse.data.data);
    } catch (error) {
      console.log('⚠️ Payment Verification (Expected for test transaction):', error.response?.data || error.message);
    }
    console.log('');

    // Test 5: Get Payment Status
    console.log('5. Testing Payment Status Check...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/api/payu/payment-status/${transactionId}`);
      console.log('✅ Payment Status Response:', statusResponse.data.data);
    } catch (error) {
      console.log('⚠️ Payment Status Check (Expected for test transaction):', error.response?.data || error.message);
    }
    console.log('');

    // Test 6: Get Transaction Details
    console.log('6. Testing Transaction Details...');
    try {
      const detailsResponse = await axios.get(`${BASE_URL}/api/payu/transaction/${transactionId}`);
      console.log('✅ Transaction Details Response:', detailsResponse.data.data);
    } catch (error) {
      console.log('⚠️ Transaction Details (Expected for test transaction):', error.response?.data || error.message);
    }
    console.log('');

    // Test 7: Test Success Callback
    console.log('7. Testing Success Callback...');
    const successResponse = await axios.get(`${BASE_URL}/api/payu/success?txnid=TEST123&status=success&amount=100`);
    console.log('✅ Success Callback Response:', successResponse.data);
    console.log('');

    // Test 8: Test Failure Callback
    console.log('8. Testing Failure Callback...');
    const failureResponse = await axios.get(`${BASE_URL}/api/payu/failure?txnid=TEST123&status=failed&amount=100`);
    console.log('✅ Failure Callback Response:', failureResponse.data);
    console.log('');

    // Test 9: Test Webhook (with mock data)
    console.log('9. Testing Webhook Handler...');
    const webhookData = {
      txnid: 'TEST_WEBHOOK_123',
      mihpayid: 'PAYU_WEBHOOK_456',
      status: 'success',
      amount: '100.00',
      email: 'test@example.com',
      phone: '9999999999',
      firstname: 'Test User',
      productinfo: 'Test Product',
      hash: 'test_hash_123'
    };
    
    try {
      const webhookResponse = await axios.post(`${BASE_URL}/api/payu/webhook`, webhookData);
      console.log('✅ Webhook Response:', webhookResponse.data);
    } catch (error) {
      console.log('⚠️ Webhook Test (Expected for test data):', error.response?.data || error.message);
    }
    console.log('');

    console.log('🎉 All PayU Integration Tests Completed!');
    console.log('\n📋 Complete API Endpoints Summary:');
    console.log('   • GET  /health - Health check');
    console.log('   • POST /api/payu/generate-qr - Generate QR code');
    console.log('   • POST /api/payu/create-form - Create payment form');
    console.log('   • POST /api/payu/verify-payment - Verify payment');
    console.log('   • GET  /api/payu/payment-status/:txnid - Get payment status');
    console.log('   • GET  /api/payu/transaction/:txnid - Get transaction details');
    console.log('   • POST /api/payu/webhook - PayU webhook handler');
    console.log('   • GET  /api/payu/success - Success callback');
    console.log('   • GET  /api/payu/failure - Failure callback');
    console.log('\n🔧 PayU Configuration:');
    console.log('   • Merchant Key:', process.env.PAYU_MERCHANT_KEY || 'Not configured');
    console.log('   • Mode:', process.env.PAYU_MODE || 'test');
    console.log('   • Base URL:', process.env.PAYU_BASE_URL || 'https://test.payu.in');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPayUIntegration(); 