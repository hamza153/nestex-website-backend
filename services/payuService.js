const crypto = require('crypto');
const axios = require('axios');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cheerio = require('cheerio');

class PayUService {
  constructor() {
    this.merchantKey = process.env.PAYU_MERCHANT_KEY;
    this.merchantSalt = process.env.PAYU_MERCHANT_SALT;
    this.mode = process.env.PAYU_MODE;
    this.baseUrl = process.env.PAYU_BASE_URL;
    
    if (!this.merchantKey || !this.merchantSalt) {
      console.warn('PayU credentials not configured. Please set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in .env file');
    }
  }

  /**
   * Generate a unique transaction ID
   */
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate hash for PayU API
   */
  generateHash(params) {
    const key = params.key;
    const salt = params.salt;
    const txnid = params.txnid;
    const amount = params.amount;
    const productinfo = params.productinfo;
    const firstname = params.firstname;
    const email = params.email;
    const udf1 = params.udf1 || '';
    const udf2 = params.udf2 || '';
    const udf3 = params.udf3 || '';
    const udf4 = params.udf4 || '';
    const udf5 = params.udf5 || '';

    // Construct hash string with exact parameter sequence
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    
    // Generate SHA-512 hash
    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  extractQrOrUpi(html) {
    const $ = cheerio.load(html);
  
    // Option A: Look for <img> (QR code)
    const imgSrc = $('img').filter((i, el) => {
      const src = $(el).attr('src') || '';
      return src.includes('upi') || src.endsWith('.png') || src.includes('qr');
    }).first().attr('src');
  
    if (imgSrc) {
      return { type: 'qrImage', url: imgSrc };
    }
  
    // Option B: Look for <a href="upi://...">
    const link = $('a[href^="upi://"]').first().attr('href');
    if (link) {
      return { type: 'upiLink', url: link };
    }
  
    // If not found
    return null;
  }

  /**
   * Generate QR code using PayU's API for QR payments
   */
  async generateQRCode({ customerId, customerName, customerEmail, customerPhone, amount }) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error('PayU credentials not configured');
      }

      const txnid = this.generateTransactionId();
      const surl = `${process.env.BASE_URL || 'https://nestex-website-backend-543a54e82797.herokuapp.com'}/api/payu/success`;
      const furl = `${process.env.BASE_URL || 'https://nestex-website-backend-543a54e82797.herokuapp.com'}/api/payu/failure`;

      // Prepare payment parameters
      const paymentParams = {
        key: this.merchantKey,
        salt: this.merchantSalt,
        txnid: txnid,
        amount: amount,
        productinfo: 'Payment for services',
        firstname: customerName,
        email: customerEmail,
        phone: customerPhone,
        surl: surl,
        furl: furl,
        mode: this.mode || 'test'
      };

      // Generate hash
      const hash = this.generateHash(paymentParams);
      paymentParams.hash = hash;

      // Create payment URL for QR code
      const paymentUrl = `${this.baseUrl}/_payment`;
      
      // Create form data for the payment URL
      const formData = new URLSearchParams();
      Object.keys(paymentParams).forEach(key => {
        formData.append(key, paymentParams[key]);
      });
      
      // Generate QR code for the payment URL
      const qrPaymentUrl = `${paymentUrl}?${formData.toString()}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrPaymentUrl);

      // Also generate a UPI payment URL for direct UPI payments
      const upiPaymentUrl = `upi://pay?pa=${this.merchantKey}&pn=${encodeURIComponent(customerName)}&am=${amount}&tn=${encodeURIComponent('Payment for services')}&cu=INR`;

      return {
        transactionId: txnid,
        amount: amount,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        qrCodeDataUrl: qrCodeDataUrl,
        qrPaymentUrl: qrPaymentUrl,
        upiPaymentUrl: upiPaymentUrl,
        paymentUrl: paymentUrl,
        formData: paymentParams,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate payment request with QR code (legacy method for backward compatibility)
   */
  async generatePaymentRequest({ amount, customerName, customerEmail, customerPhone }) {
    try {
      const customerId = `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use the new QR generation API
      const qrData = await this.generateQRCode({
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        amount
      });

      return {
        transactionId: qrData.transactionId,
        amount: qrData.amount,
        customerName: qrData.customerName,
        customerEmail: qrData.customerEmail,
        customerPhone: qrData.customerPhone,
        qrCodeDataUrl: qrData.qrCodeDataUrl,
        qrPaymentUrl: qrData.qrPaymentUrl,
        upiPaymentUrl: qrData.upiPaymentUrl,
        paymentUrl: qrData.paymentUrl,
        formData: qrData.formData,
        timestamp: qrData.timestamp
      };

    } catch (error) {
      console.error('Error generating payment request:', error);
      throw new Error('Failed to generate payment request');
    }
  }

  /**
   * Verify payment status using PayU API
   */
  async verifyPayment(txnid) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error('PayU credentials not configured');
      }

      const verificationParams = {
        key: this.merchantKey,
        command: 'verify_payment',
        var1: txnid,
        hash: this.generateHash({ 
          key: this.merchantKey, 
          command: 'verify_payment', 
          var1: txnid 
        })
      };

      // Use appropriate API endpoint based on environment
      let apiEndpoint;
      if (this.mode === 'production') {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      } else {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      }

      // Make API call to PayU verification endpoint
      const response = await axios.post(
        apiEndpoint,
        verificationParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      console.log('PayU verification response:', response.data);

      // Parse PayU response
      const responseData = response.data;
      
      if (responseData.status === 'success') {
        return {
          transactionId: txnid,
          status: 'success',
          amount: responseData.amount || '0.00',
          paymentDate: new Date().toISOString(),
          payuPaymentId: responseData.mihpayid || '',
          bankRefNumber: responseData.bank_ref_num || '',
          mode: responseData.mode || '',
          bankCode: responseData.bankcode || '',
          message: 'Payment verified successfully'
        };
      } else {
        return {
          transactionId: txnid,
          status: 'failed',
          message: responseData.error_Message || 'Payment verification failed',
          errorCode: responseData.error_code || ''
        };
      }

    } catch (error) {
      console.error('Error verifying payment:', error);
      
      // If API call fails, return error response
      return {
        transactionId: txnid,
        status: 'error',
        message: 'Failed to verify payment',
        error: error.message
      };
    }
  }

  /**
   * Get payment status from PayU
   */
  async getPaymentStatus(txnid) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error('PayU credentials not configured');
      }

      const statusParams = {
        key: this.merchantKey,
        command: 'get_merchant_ibibo_details',
        var1: txnid,
        hash: this.generateHash({ 
          key: this.merchantKey, 
          command: 'get_merchant_ibibo_details', 
          var1: txnid 
        })
      };

      // Use appropriate API endpoint based on environment
      let apiEndpoint;
      if (this.mode === 'production') {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      } else {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      }

      // Make API call to PayU status endpoint
      const response = await axios.post(
        apiEndpoint,
        statusParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      console.log('PayU status response:', response.data);

      const responseData = response.data;
      
      if (responseData.status === 'success') {
        return {
          transactionId: txnid,
          status: 'success',
          amount: responseData.amount || '0.00',
          paymentDate: new Date().toISOString(),
          payuPaymentId: responseData.mihpayid || '',
          bankRefNumber: responseData.bank_ref_num || '',
          mode: responseData.mode || '',
          bankCode: responseData.bankcode || '',
          customerName: responseData.firstname || '',
          customerEmail: responseData.email || '',
          customerPhone: responseData.phone || ''
        };
      } else {
        return {
          transactionId: txnid,
          status: 'failed',
          message: responseData.error_Message || 'Payment status check failed',
          errorCode: responseData.error_code || ''
        };
      }

    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        transactionId: txnid,
        status: 'error',
        message: 'Failed to get payment status',
        error: error.message
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(webhookData) {
    try {
      const receivedHash = webhookData.hash;
      const calculatedHash = this.generateHash(webhookData);
      
      console.log('Webhook signature verification:', {
        received: receivedHash,
        calculated: calculatedHash,
        isValid: receivedHash === calculatedHash
      });
      
      return receivedHash === calculatedHash;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process webhook data
   */
  async processWebhook(webhookData) {
    try {
      const {
        txnid,
        mihpayid,
        status,
        amount,
        email,
        phone,
        firstname,
        productinfo,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        hash,
        bank_ref_num,
        mode,
        bankcode
      } = webhookData;

      // Log webhook data
      console.log('Webhook received:', {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo,
        bankRefNumber: bank_ref_num,
        mode: mode,
        bankCode: bankcode
      });

      // Here you would typically:
      // 1. Update your database with payment status
      // 2. Send confirmation emails
      // 3. Trigger business logic based on payment status
      // 4. Update inventory, etc.

      // For now, we'll just return the processed data
      return {
        success: true,
        transactionId: txnid,
        status: status,
        amount: amount,
        payuPaymentId: mihpayid,
        bankRefNumber: bank_ref_num,
        mode: mode,
        bankCode: bankcode,
        customerName: firstname,
        customerEmail: email,
        customerPhone: phone,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new Error('Failed to process webhook');
    }
  }

  /**
   * Create a payment form for direct submission
   */
  createPaymentForm(paymentData) {
    const formHtml = `
      <form id="payuForm" action="${paymentData.paymentUrl}" method="post">
        <input type="hidden" name="key" value="${paymentData.formData.key}">
        <input type="hidden" name="txnid" value="${paymentData.formData.txnid}">
        <input type="hidden" name="amount" value="${paymentData.formData.amount}">
        <input type="hidden" name="productinfo" value="${paymentData.formData.productinfo}">
        <input type="hidden" name="firstname" value="${paymentData.formData.firstname}">
        <input type="hidden" name="email" value="${paymentData.formData.email}">
        <input type="hidden" name="phone" value="${paymentData.formData.phone}">
        <input type="hidden" name="pg" value="${paymentData.formData.pg}">
        <input type="hidden" name="bankcode" value="${paymentData.formData.bankcode}">
        <input type="hidden" name="surl" value="${paymentData.formData.surl}">
        <input type="hidden" name="furl" value="${paymentData.formData.furl}">
        <input type="hidden" name="mode" value="${paymentData.formData.mode}">
        <input type="hidden" name="hash" value="${paymentData.formData.hash}">
        <button type="submit">Pay Now</button>
      </form>
    `;
    
    return formHtml;
  }

  /**
   * Get PayU transaction details
   */
  async getTransactionDetails(txnid) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error('PayU credentials not configured');
      }

      const detailsParams = {
        key: this.merchantKey,
        command: 'get_merchant_ibibo_details',
        var1: txnid,
        hash: this.generateHash({ 
          key: this.merchantKey, 
          command: 'get_merchant_ibibo_details', 
          var1: txnid 
        })
      };

      // Use appropriate API endpoint based on environment
      let apiEndpoint;
      if (this.mode === 'production') {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      } else {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      }

      const response = await axios.post(
        apiEndpoint,
        detailsParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      return response.data;

    } catch (error) {
      console.error('Error getting transaction details:', error);
      throw new Error('Failed to get transaction details');
    }
  }
}

module.exports = PayUService; 