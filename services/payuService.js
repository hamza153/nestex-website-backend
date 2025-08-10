const crypto = require("crypto");
const axios = require("axios");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const cheerio = require("cheerio");
const PayU = require("payu-websdk");
const UserMongoSchema = require("../models/user");
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
   * Generate a unique transaction ID
   */
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

      let customer = await UserMongoSchema.findOne({ email: customerEmail });

      if (!customer) {
        customer = new UserMongoSchema({
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        });
        await customer.save();
      }

      const txnid = this.generateTransactionId();

      const payment = new PaymentMongoSchema({
        amount: parseFloat(amount),
        reference: txnid,
        status: "pending",
        transactionReferenceId: txnid,
        thirdPartyTransactionId: txnid,
      });

      await payment.save();

      const paymentId = payment._id;
      const customerId = customer._id;

      customer.payments.push(paymentId);
      await customer.save();

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
   * Save Payment Response
   */
  async savePaymentResponse(paymentResponse, eventType) {
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
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      udf6,
      udf7,
      udf8,
      udf9,
      udf10,
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
      meCode,
      PG_TYPE,
      bank_ref_num,
      bankcode,
    } = paymentResponse;
    try {
      const webhookData = {
        qrWebHookEvent: eventType,
        qrWebHookPayload: paymentResponse,
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
          customer_last_name: lastname || "",
          customer_address1: address1 || "",
          customer_address2: address2 || "",
          customer_city: city || "",
          customer_state: state || "",
          customer_country: country || "",
          customer_zipcode: zipcode || "",
          customer_email: email,
          customer_phone: phone,
          udf1: udf1 || "",
          udf2: udf2 || "",
          udf3: udf3 || "",
          udf4: udf4 || "",
          udf5: udf5 || "",
          udf6: udf6 || "",
          udf7: udf7 || "",
          udf8: udf8 || "",
          udf9: udf9 || "",
          udf10: udf10 || "",
          hash: hash,
          field1: field1 || "",
          field2: field2 || "",
          field3: field3 || "",
          field4: field4 || "",
          field5: field5 || "",
          field6: field6 || "",
          field7: field7 || "",
          field8: field8 || "",
          field9: field9 || "",
          payment_source: payment_source,
          error: error || "",
          error_message: error_Message || "",
          meCode: meCode || "",
          PG_TYPE: PG_TYPE || "",
          bank_ref_num: bank_ref_num || "",
          bankcode: bankcode || "",
        },
      };

      const webhook = new WebhookMongoSchema(webhookData);
      await webhook.save();

      const payment = await PaymentMongoSchema.findOne({
        reference: txnid,
      });
      payment.status = eventType === "payment_success" ? "success" : "failed";
      payment.paymentId = mihpayid || "";
      payment.qrWebHookData = webhookData;
      await payment.save();

      let url = new URL(process.env.FE_BASE_URL);

      if (eventType === "payment_success") {
        url.pathname = "/payment/success";
      } else {
        url.pathname = "/payment/failure";
      }

      url.searchParams.set("txnid", txnid);
      if (amount !== undefined && amount !== null) {
        url.searchParams.set("amount", amount);
      }
      if (firstname) {
        url.searchParams.set("firstname", firstname);
      }
      if (email) {
        url.searchParams.set("email", email);
      }
      if (phone) {
        url.searchParams.set("phone", phone);
      }
      if (error) {
        url.searchParams.set("error_code", error);
      }
      if (error_Message) {
        url.searchParams.set("error_message", error_Message);
      }
      return url.toString();
    } catch (error) {
      console.error("Error saving payment response:", error);
      throw new Error(`Failed to save payment response: ${error.message}`);
    }
  }
}

module.exports = PayUService;
