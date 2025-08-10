const express = require("express");
const router = express.Router();
const PayUService = require("../services/payuService");
const WebhookMongoSchema = require("../models/webhook");
const qr = require("qrcode");
const { URL } = require("url");

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
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
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
 * Success callback handler
 * GET /api/payu/success
 */
router.post("/success", async (req, res) => {
  try {
    const url = await payuService.savePaymentResponse(
      req.body,
      "payment_success"
    );

    return res.redirect(303, url);
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
    const url = await payuService.savePaymentResponse(
      req.body,
      "payment_failure"
    );

    return res.redirect(303, url);
  } catch (error) {
    console.error("Error in failure callback:", error);
    res.status(500).json({
      error: "Error processing failure callback",
      message: error.message,
    });
  }
});

module.exports = router;
