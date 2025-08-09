const crypto = require("crypto");
const axios = require("axios");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const cheerio = require("cheerio");
const PayU = require("payu-websdk");

class PayUService {
  constructor() {
    this.merchantKey = process.env.PAYU_MERCHANT_KEY;
    this.merchantSalt = process.env.PAYU_MERCHANT_SALT;
    this.mode = process.env.PAYU_MODE;
    this.baseUrl = process.env.PAYU_BASE_URL;

    this.payUClient = new PayU(
      {
        key: this.merchantKey,
        salt: this.merchantSalt,
      },
      this.mode === "production" ? "PROD" : "TEST"
    );

    if (!this.merchantKey || !this.merchantSalt) {
      console.warn(
        "PayU credentials not configured. Please set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in .env file"
      );
    }
  }

  /**
   * Generate a unique transaction ID
   */
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique qr ID
   */
  generateQrId() {
    return `QR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate hash for PayU API
   */
  generateHash(params) {
    // PayU hash format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|||||SALT
    const { key, txnid, amount, productinfo, firstname, email } = params;
    const udf1 = params.udf1 || "";
    const udf2 = params.udf2 || "";
    const udf3 = params.udf3 || "";
    const udf4 = params.udf4 || "";
    const udf5 = params.udf5 || "";

    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|||||${this.merchantSalt}`;

    const hash = crypto.createHash("sha512").update(hashString).digest("hex");
    return hash;
  }

  extractQrOrUpi(html) {
    const $ = cheerio.load(html);

    // Option A: Look for <img> (QR code)
    const imgSrc = $("img")
      .filter((i, el) => {
        const src = $(el).attr("src") || "";
        return (
          src.includes("upi") || src.endsWith(".png") || src.includes("qr")
        );
      })
      .first()
      .attr("src");

    if (imgSrc) {
      return { type: "qrImage", url: imgSrc };
    }

    // Option B: Look for <a href="upi://...">
    const link = $('a[href^="upi://"]').first().attr("href");
    if (link) {
      return { type: "upiLink", url: link };
    }

    // If not found
    return null;
  }

  /**
   * Generate QR code using PayU's API for QR payments
   */
  async generatePaymentIntent({
    customerName,
    customerEmail,
    customerPhone,
    amount,
  }) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error("PayU credentials not configured");
      }

      const txnid = this.generateTransactionId();
      const surl = `${process.env.BASE_URL}/api/payu/success`;
      const furl = `${process.env.BASE_URL}/api/payu/failure`;
      const amountFormatted = parseFloat(amount);
      const productinfo = "Payment for services";
      const firstname = customerName;
      const email = customerEmail;
      const phone = customerPhone;

      const hash = this.generateHash({
        key: this.merchantKey,
        txnid: txnid,
        expirytime: 3600,
        amount: amountFormatted.toFixed(2),
      });

      const data = await this.payUClient.paymentInitiate({
        isAmountFilledByCustomer: false,
        txnid: txnid,
        amount: amount,
        currency: "INR",
        productinfo: productinfo,
        firstname: firstname,
        email: email,
        phone: phone,
        surl: surl,
        furl: furl,
        hash,
      });

      return data;
    } catch (error) {
      console.error("Error generating QR code:", error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Verify payment status using PayU API
   */
  async verifyPayment(txnid) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error("PayU credentials not configured");
      }

      const verificationParams = {
        key: this.merchantKey,
        command: "verify_payment",
        var1: txnid,
        hash: this.generateHash({
          key: this.merchantKey,
          command: "verify_payment",
          var1: txnid,
        }),
      };

      // Use appropriate API endpoint based on environment
      let apiEndpoint;
      if (this.mode === "production") {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      } else {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      }

      // Make API call to PayU verification endpoint
      const response = await axios.post(apiEndpoint, verificationParams, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      });

      console.log("PayU verification response:", response.data);

      // Parse PayU response
      const responseData = response.data;

      if (responseData.status === "success") {
        return {
          transactionId: txnid,
          status: "success",
          amount: responseData.amount || "0.00",
          paymentDate: new Date().toISOString(),
          payuPaymentId: responseData.mihpayid || "",
          bankRefNumber: responseData.bank_ref_num || "",
          mode: responseData.mode || "",
          bankCode: responseData.bankcode || "",
          message: "Payment verified successfully",
        };
      } else {
        return {
          transactionId: txnid,
          status: "failed",
          message: responseData.error_Message || "Payment verification failed",
          errorCode: responseData.error_code || "",
        };
      }
    } catch (error) {
      console.error("Error verifying payment:", error);

      // If API call fails, return error response
      return {
        transactionId: txnid,
        status: "error",
        message: "Failed to verify payment",
        error: error.message,
      };
    }
  }

  /**
   * Get payment status from PayU
   */
  async getPaymentStatus(txnid) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error("PayU credentials not configured");
      }

      const statusParams = {
        key: this.merchantKey,
        command: "get_merchant_ibibo_details",
        var1: txnid,
        hash: this.generateHash({
          key: this.merchantKey,
          command: "get_merchant_ibibo_details",
          var1: txnid,
        }),
      };

      // Use appropriate API endpoint based on environment
      let apiEndpoint;
      if (this.mode === "production") {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      } else {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      }

      // Make API call to PayU status endpoint
      const response = await axios.post(apiEndpoint, statusParams, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      });

      console.log("PayU status response:", response.data);

      const responseData = response.data;

      if (responseData.status === "success") {
        return {
          transactionId: txnid,
          status: "success",
          amount: responseData.amount || "0.00",
          paymentDate: new Date().toISOString(),
          payuPaymentId: responseData.mihpayid || "",
          bankRefNumber: responseData.bank_ref_num || "",
          mode: responseData.mode || "",
          bankCode: responseData.bankcode || "",
          customerName: responseData.firstname || "",
          customerEmail: responseData.email || "",
          customerPhone: responseData.phone || "",
        };
      } else {
        return {
          transactionId: txnid,
          status: "failed",
          message: responseData.error_Message || "Payment status check failed",
          errorCode: responseData.error_code || "",
        };
      }
    } catch (error) {
      console.error("Error getting payment status:", error);
      return {
        transactionId: txnid,
        status: "error",
        message: "Failed to get payment status",
        error: error.message,
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

      console.log("Webhook signature verification:", {
        received: receivedHash,
        calculated: calculatedHash,
        isValid: receivedHash === calculatedHash,
      });

      return receivedHash === calculatedHash;
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
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
        bankcode,
      } = webhookData;

      // Log webhook data
      console.log("Webhook received:", {
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
        bankCode: bankcode,
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
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error processing webhook:", error);
      throw new Error("Failed to process webhook");
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
        throw new Error("PayU credentials not configured");
      }

      const detailsParams = {
        key: this.merchantKey,
        command: "get_merchant_ibibo_details",
        var1: txnid,
        hash: this.generateHash({
          key: this.merchantKey,
          command: "get_merchant_ibibo_details",
          var1: txnid,
        }),
      };

      // Use appropriate API endpoint based on environment
      let apiEndpoint;
      if (this.mode === "production") {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      } else {
        apiEndpoint = `${this.baseUrl}/merchant/postservice.php?form=2`;
      }

      const response = await axios.post(apiEndpoint, detailsParams, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error("Error getting transaction details:", error);
      throw new Error("Failed to get transaction details");
    }
  }
}

module.exports = PayUService;
