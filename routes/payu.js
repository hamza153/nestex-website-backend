const express = require("express");
const router = express.Router();
const PayUService = require("../services/payuService");
const WebhookMongoSchema = require("../models/webhook");
const qr = require("qrcode");

// Initialize PayU service
const payuService = new PayUService();

router.post("/generate-qr-for-payment-page", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, amount } = req.body;

    //using payment redirect route create a QR
    const qrLink =
      process.env.BASE_URL +
      "/api/payu/payment-redirect?customerName=" +
      customerName +
      "&customerEmail=" +
      customerEmail +
      "&customerPhone=" +
      customerPhone +
      "&amount=" +
      amount;

    const qrImage = await qr.toDataURL(qrLink);

    res.json({
      success: true,
      data: {
        qrCodeDataUrl: qrImage,
        amount: amount,
        customerName: customerName,
      },
      message: "QR code generated successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate QR code for payment page",
      message: error.message,
    });
  }
});

/**
 * POST /api/payu/generate-qr-static
 * Body: { customerId: string, customerName: string, customerEmail: string, customerPhone: string, amount: number }
 */
router.get("/payment-redirect", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, amount } = req.query;

    // Generate QR code using PayU's API
    const qrData = await payuService.generatePaymentIntent({
      customerName: customerName || "Customer",
      customerEmail: customerEmail || "customer@example.com",
      customerPhone: customerPhone || "9999999999",
      amount: parseFloat(amount),
    });

    res.send(qrData);
  } catch (error) {
    res.status(500).json({
      error: "Failed to redirect to payment page",
      message: error.message,
    });
  }
});

/**
 * Verify payment status
 * POST /api/payu/verify-payment
 * Body: { txnid: string }
 */
router.post("/verify-payment", async (req, res) => {
  try {
    const { txnid } = req.body;

    if (!txnid) {
      return res.status(400).json({
        error: "Transaction ID is required",
      });
    }

    const paymentStatus = await payuService.verifyPayment(txnid);

    res.json({
      success: true,
      data: paymentStatus,
      message: "Payment status retrieved successfully",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      error: "Failed to verify payment",
      message: error.message,
    });
  }
});

/**
 * Get payment status by transaction ID
 * GET /api/payu/payment-status/:txnid
 */
router.get("/payment-status/:txnid", async (req, res) => {
  try {
    const { txnid } = req.params;

    if (!txnid) {
      return res.status(400).json({
        error: "Transaction ID is required",
      });
    }

    const paymentStatus = await payuService.getPaymentStatus(txnid);

    res.json({
      success: true,
      data: paymentStatus,
      message: "Payment status retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting payment status:", error);
    res.status(500).json({
      error: "Failed to get payment status",
      message: error.message,
    });
  }
});

/**
 * Get transaction details
 * GET /api/payu/transaction/:txnid
 */
router.get("/transaction/:txnid", async (req, res) => {
  try {
    const { txnid } = req.params;

    if (!txnid) {
      return res.status(400).json({
        error: "Transaction ID is required",
      });
    }

    const transactionDetails = await payuService.getTransactionDetails(txnid);

    res.json({
      success: true,
      data: transactionDetails,
      message: "Transaction details retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting transaction details:", error);
    res.status(500).json({
      error: "Failed to get transaction details",
      message: error.message,
    });
  }
});

/**
 * PayU webhook handler
 * POST /api/payu/webhook
 */
router.post("/webhook", async (req, res) => {
  try {
    const webhookData = req.body;

    console.log("Webhook received:", webhookData);

    // Verify webhook signature
    const isValid = payuService.verifyWebhookSignature(webhookData);

    if (!isValid) {
      console.error("Invalid webhook signature");
      return res.status(400).json({
        error: "Invalid webhook signature",
      });
    }

    // Process webhook data
    const processedData = await payuService.processWebhook(webhookData);

    res.json({
      success: true,
      data: processedData,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({
      error: "Failed to process webhook",
      message: error.message,
    });
  }
});

/**
 * Success callback handler
 * GET /api/payu/success
 */
router.post("/success", async (req, res) => {
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
      hash,
    } = req.body;


    const webhookData = {
      qrWebHookEvent: "payment_success",
      qrWebHookPayload: req.body,
      qrWebHookData: {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo,
      },
    };

    const webhook = new WebhookMongoSchema(webhookData);
    await webhook.save();

    res.json({
      success: true,
      message: "Payment successful",
      data: {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo,
      },
    });
  } catch (error) {
    console.error("Error in success callback:", error);
    res.status(500).json({
      error: "Error processing success callback",
      message: error.message,
    });
  }
});

/**
 * Failure callback handler
 * GET /api/payu/failure
 */
router.post("/failure", async (req, res) => {
  try {
    const {
      mihpayid,
      status,
      unmappedstatus,
      key,
      txnid,
      amount,
      net_amount_debit,
      addedon,
      productinfo,
      firstname,
      lastname,
      address1,
      address2,
      city,
      state,
      country,
      zipcode,
      email,
      phone,
      hash,
      field1,
      field2,
      field3,
      field4,
      field5,
      field6,
      field7,
      field8,
      field9,
      payment_source,
      error,
      error_Message,
    } = req.body;

    const webhookData = {
      qrWebHookEvent: "payment_failure",
      qrWebHookPayload: req.body,
      qrWebHookData: {
        payu_id: mihpayid,
        status: status,
        unmapped_status: unmappedstatus,
        key: key,
        txnid: txnid,
        amount: amount,
        net_amount_debit: net_amount_debit,
        added_on: addedon,
        product_info: productinfo,
        customer_first_name: firstname,
        customer_last_name: lastname,
        customer_address1: address1,
        customer_address2: address2,
        customer_city: city,
        customer_state: state,
        customer_country: country,
        customer_zipcode: zipcode,
        customer_email: email,
        customer_phone: phone,
        hash: hash,
        field1: field1,
        field2: field2,
        field3: field3,
        field4: field4,
        field5: field5,
        field6: field6,
        field7: field7,
        field8: field8,
        field9: field9,
        payment_source: payment_source,
        error: error,
        error_message: error_Message,
      },
    };

    const webhook = new WebhookMongoSchema(webhookData);
    await webhook.save();

    res.json({
      success: false,
      message: "Payment failed",
      data: {
        transactionId: txnid,
        payuPaymentId: mihpayid,
        status: status,
        amount: amount,
        customerEmail: email,
        customerPhone: phone,
        customerName: firstname,
        productInfo: productinfo,
      },
    });
  } catch (error) {
    console.error("Error in failure callback:", error);
    res.status(500).json({
      error: "Error processing failure callback",
      message: error.message,
    });
  }
});

module.exports = router;
