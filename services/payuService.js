const crypto = require("crypto");
const PayU = require("payu-websdk");
const PaymentMongoSchema = require("../models/payment");
const WebhookMongoSchema = require("../models/webhook");

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

  async storePayementData(
    transactionReferenceId,
    amount,
    customerName,
    customerEmail,
    customerPhone
  ) {
    const payment = new PaymentMongoSchema({
      amount,
      date: new Date(),
      status: "pending",
      transactionReferenceId,
    });
    await payment.save();
  }

  /**
   * Generate QR code using PayU's API for QR payments for Turbo Chat
   */
  async generatePaymentIntentWithTxnId({
    customerName,
    customerEmail,
    customerPhone,
    amount,
    txnId,
  }) {
    try {
      if (!this.merchantKey || !this.merchantSalt) {
        throw new Error("PayU credentials not configured");
      }

      const surl = `${process.env.BASE_URL}/payment/successPayu`;
      const furl = `${process.env.BASE_URL}/payment/failurePayu`;
      const amountFormatted = parseFloat(amount);
      const productinfo = `Payment for AI chat service for ${amount?.toFixed(
        2
      )} INR`;
      const firstname = customerName;
      const email = customerEmail;
      const phone = customerPhone;

      const hash = this.generateHash({
        key: this.merchantKey,
        txnid: txnId,
        expirytime: 3600,
        amount: amountFormatted.toFixed(2),
      });

      const data = await this.payUClient.paymentInitiate({
        isAmountFilledByCustomer: false,
        txnid: txnId,
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

  async verifyPayUPayments({ txnID }) {
    const txnData = await this.payUClient.verifyPayment(txnID);
    return txnData;
  }
  
  /**
   * Save Payment Response
   */
  async savePaymentResponse(paymentResponse) {
    try {
      const webhookData = {
        qrWebHookEvent: paymentResponse?.status,
        qrWebHookPayload: paymentResponse,
        qrWebHookData: paymentResponse,
      };

      const webhook = new WebhookMongoSchema(webhookData);
      await webhook.save();

      const payment = await PaymentMongoSchema.findOne({
        transactionReferenceId: paymentResponse?.transactionReferenceId,
      });

      if (payment) {
        payment.status = paymentResponse?.status;
        payment.paymentId = paymentResponse?.mihpayid || "";
        payment.qrWebHookData = paymentResponse;
        await payment.save();
      }

      return true;
    } catch (error) {
      console.error("Error saving payment response:", error);
      throw new Error(`Failed to save payment response: ${error.message}`);
    }
  }
}

module.exports = PayUService;
