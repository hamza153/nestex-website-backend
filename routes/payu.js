const express = require('express');
const router = express.Router();
const PayUService = require('../services/payuService');
const WebhookMongoSchema = require('../models/webhook');

// Initialize PayU service
const payuService = new PayUService();

/**
 * Generate QR code using PayU's Insta Static QR Generation API
 * POST /api/payu/generate-qr-static
 * Body: { customerId: string, customerName: string, customerEmail: string, customerPhone: string, amount: number }
 */
router.post('/generate-qr-static', async (req, res) => {
  try {
    const { customerId, customerName, customerEmail, customerPhone, amount } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount is required and must be greater than 0'
      });
    }

    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required'
      });
    }

    // Generate QR code using PayU's API
    const qrData = await payuService.generateQRCode({
      customerId,
      customerName: customerName || 'Customer',
      customerEmail: customerEmail || 'customer@example.com',
      customerPhone: customerPhone || '9999999999',
      amount
    });

    res.json({
      success: true,
      data: qrData,
      message: 'QR code generated successfully using PayU API'
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      error: 'Failed to generate QR code',
      message: error.message
    });
  }
});

/**
 * Verify payment status
 * POST /api/payu/verify-payment
 * Body: { txnid: string }
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { txnid } = req.body;

    if (!txnid) {
      return res.status(400).json({
        error: 'Transaction ID is required'
      });
    }

    const paymentStatus = await payuService.verifyPayment(txnid);

    res.json({
      success: true,
      data: paymentStatus,
      message: 'Payment status retrieved successfully'
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});

/**
 * Get payment status by transaction ID
 * GET /api/payu/payment-status/:txnid
 */
router.get('/payment-status/:txnid', async (req, res) => {
  try {
    const { txnid } = req.params;

    if (!txnid) {
      return res.status(400).json({
        error: 'Transaction ID is required'
      });
    }

    const paymentStatus = await payuService.getPaymentStatus(txnid);

    res.json({
      success: true,
      data: paymentStatus,
      message: 'Payment status retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      message: error.message
    });
  }
});

/**
 * Get transaction details
 * GET /api/payu/transaction/:txnid
 */
router.get('/transaction/:txnid', async (req, res) => {
  try {
    const { txnid } = req.params;

    if (!txnid) {
      return res.status(400).json({
        error: 'Transaction ID is required'
      });
    }

    const transactionDetails = await payuService.getTransactionDetails(txnid);

    res.json({
      success: true,
      data: transactionDetails,
      message: 'Transaction details retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({
      error: 'Failed to get transaction details',
      message: error.message
    });
  }
});

/**
 * Create payment form
 * POST /api/payu/create-form
 * Body: { amount: number, customerName?: string, customerEmail?: string, customerPhone?: string }
 */
router.post('/create-form', async (req, res) => {
  try {
    const { amount, customerName, customerEmail, customerPhone } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount is required and must be greater than 0'
      });
    }

    // Generate payment request
    const paymentData = await payuService.generatePaymentRequest({
      amount,
      customerName: customerName || 'Customer',
      customerEmail: customerEmail || 'customer@example.com',
      customerPhone: customerPhone || '9999999999'
    });

    // Create payment form
    const paymentForm = payuService.createPaymentForm(paymentData);

    res.json({
      success: true,
      data: {
        ...paymentData,
        paymentForm: paymentForm
      },
      message: 'Payment form created successfully'
    });

  } catch (error) {
    console.error('Error creating payment form:', error);
    res.status(500).json({
      error: 'Failed to create payment form',
      message: error.message
    });
  }
});

/**
 * PayU webhook handler
 * POST /api/payu/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('Webhook received:', webhookData);
    
    // Verify webhook signature
    const isValid = payuService.verifyWebhookSignature(webhookData);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        error: 'Invalid webhook signature'
      });
    }

    // Process webhook data
    const processedData = await payuService.processWebhook(webhookData);

    res.json({
      success: true,
      data: processedData,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

/**
 * Success callback handler
 * GET /api/payu/success
 */
router.get('/success', async (req, res) => {
  try {
    const { txnid, mihpayid, status, amount, email, phone, firstname, productinfo, hash } = req.query;
    
    console.log('Payment success callback:', req.query);

    const webhookData = {
      qrWebHookEvent: 'payment_success',
      qrWebHookPayload: req.query,
      qrWebHookData: {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo
      }
    };

    const webhook = new WebhookMongoSchema(webhookData);
    await webhook.save();
    
    res.json({
      success: true,
      message: 'Payment successful',
      data: {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo
      }
    });

  } catch (error) {
    console.error('Error in success callback:', error);
    res.status(500).json({
      error: 'Error processing success callback',
      message: error.message
    });
  }
});

/**
 * Failure callback handler
 * GET /api/payu/failure
 */
router.get('/failure', async (req, res) => {
  try {
    const { txnid, mihpayid, status, amount, email, phone, firstname, productinfo, hash } = req.query;
    
    console.log('Payment failure callback:', req.query);

    const webhookData = {
      qrWebHookEvent: 'payment_failure',
      qrWebHookPayload: req.query,
      qrWebHookData: {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo
      }
    };

    const webhook = new WebhookMongoSchema(webhookData);
    await webhook.save();
    
    res.json({
      success: false,
      message: 'Payment failed',
      data: {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo
      }
    });

  } catch (error) {
    console.error('Error in failure callback:', error);
    res.status(500).json({
      error: 'Error processing failure callback',
      message: error.message
    });
  }
});

module.exports = router; 