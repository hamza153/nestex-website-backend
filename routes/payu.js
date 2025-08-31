const express = require("express");
const router = express.Router();
const PayUService = require("../services/payuService");
const qr = require("qrcode");
const axios = require("axios");

// Initialize PayU service
const payuService = new PayUService();

router.post("/sendPaymentRequestPayu", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, amount } = req.body;

    //using payment redirect route create a QR
    let data = JSON.stringify({
      amount: amount,
      accessCode: "253324",
      customerName: customerName,
      customerContact: customerPhone,
      customerEmail: customerEmail,
      responseURL: `${process.env.SELF_URL}/api/payu/webhook`,
    });

    const response = await axios.post(
      `${process.env.BASE_URL}/payment/generateRedirectionURLPayu`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    const qrImage = response?.data?.data?.redirectURL;
    const transactionReferenceId = response?.data?.data?.transactionReferenceId;

    await payuService.storePayementData(transactionReferenceId, amount, customerName, customerEmail, customerPhone);

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
    console.log("🚀 ~ error:", error?.response?.data?.message)
    res.status(500).json({
      error: "Failed to generate QR code for payment page",
      message: error?.response?.data?.message,
    });
  }
});

router.post("/sendPaymentRequestCashfree", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, amount } = req.body;

    //using payment redirect route create a QR
    let data = JSON.stringify({
      amount: amount,
      accessCode: "253324",
      customerName: customerName,
      customerContact: customerPhone,
      customerEmail: customerEmail,
      responseURL: `${process.env.SELF_URL}/api/payu/webhook`,
    });

    const response = await axios.post(
      `${process.env.BASE_URL}/payment/generateRedirectionURLCashfree`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    const qrImage = response?.data?.data?.redirectURL;
    const transactionReferenceId = response?.data?.data?.transactionReferenceId;

    await payuService.storePayementData(transactionReferenceId, amount, customerName, customerEmail, customerPhone);

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
    console.log("🚀 ~ error:", error?.response?.data?.message)
    res.status(500).json({
      error: "Failed to generate QR code for payment page",
      message: error?.response?.data?.message,
    });
  }
});

router.get("/payment-redirect-turbo", async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, amount, txnId } =
      req.query;

    // Generate QR code using PayU's API
    const qrData = await payuService.generatePaymentIntentWithTxnId({
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      amount: parseFloat(amount),
      txnId,
    });

    res.send(qrData);
  } catch (error) {
    res.status(500).json({
      error: "Failed to redirect to payment page",
      message: error.message,
    });
  }
});

router.post("/verifyPayments", async (req, res) => {
  try {
    const { txnID } = req.body;

    // Generate QR code using PayU's API
    const txnsData = await payuService.verifyPayUPayments({
      txnID,
    });

    res.send(txnsData);
  } catch (error) {
    console.log("🚀 ~ error:", error?.response?.data?.message)
    res.status(500).json({
      error: "Failed to generate QR code for payment page",
      message: error?.response?.data?.message,
    });
  }
});

/**
 * Success callback handler
 * GET /api/payu/success
 */
router.post("/webhook", async (req, res) => {
  try {
    const url = await payuService.savePaymentResponse(req.body);

    return res.status(200).json({});
  } catch (error) {
    console.error("Error in success callback:", error);
    res.status(500).json({
      error: "Error processing success callback",
      message: error.message,
    });
  }
});

module.exports = router;
