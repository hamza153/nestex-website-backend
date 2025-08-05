// Set environment variables for testing
process.env.PAYU_MERCHANT_KEY = 'gtKFFx';
process.env.PAYU_MERCHANT_SALT = 'eCwWELxi';
process.env.PAYU_MODE = 'test';
process.env.PAYU_BASE_URL = 'https://test.payu.in';
process.env.BASE_URL = 'http://localhost:3000';

const PayUService = require('./services/payuService');

// Initialize PayU service
const payuService = new PayUService();

async function testQRGeneration() {
  try {
    console.log('🧪 Testing QR Code Generation with Test Credentials...\n');

    // Test data
    const testData = {
      customerId: 'CUST_123456789',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '9876543210',
      amount: 100.50
    };

    console.log('📋 Test Data:', testData);
    console.log('\n🔄 Generating QR Code...\n');

    // Generate QR code
    const qrData = await payuService.generateQRCode(testData);

    console.log('✅ QR Code Generated Successfully!');
    console.log('\n📊 Generated Data:');
    console.log('Transaction ID:', qrData.transactionId);
    console.log('Amount:', qrData.amount);
    console.log('Customer Name:', qrData.customerName);
    console.log('Customer Email:', qrData.customerEmail);
    console.log('Customer Phone:', qrData.customerPhone);
    console.log('\n🔗 URLs:');
    console.log('QR Payment URL:', qrData.qrPaymentUrl);
    console.log('UPI Payment URL:', qrData.upiPaymentUrl);
    console.log('Payment URL:', qrData.paymentUrl);
    
    console.log('\n📱 QR Code Data URL (Base64):');
    console.log('Length:', qrData.qrCodeDataUrl.length, 'characters');
    console.log('Preview:', qrData.qrCodeDataUrl.substring(0, 100) + '...');
    
    console.log('\n📋 Form Data:');
    console.log(JSON.stringify(qrData.formData, null, 2));
    
    console.log('\n⏰ Timestamp:', qrData.timestamp);
    
    console.log('\n🎯 How to use:');
    console.log('1. Display the QR code using the qrCodeDataUrl');
    console.log('2. Users can scan the QR code to make payment');
    console.log('3. Or use the UPI payment URL for direct UPI payments');
    console.log('4. Monitor payment status using the transaction ID');

    // Test the UPI URL format
    console.log('\n🔍 UPI URL Analysis:');
    console.log('UPI URL:', qrData.upiPaymentUrl);
    console.log('This URL can be used directly in UPI apps');

  } catch (error) {
    console.error('❌ Error generating QR code:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testQRGeneration(); 