const { mongoose } = require("../config/db");
const { Schema } = mongoose;

const paymentSchema = new Schema({
  amount: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  reference: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    default: "pending",
  },
  transactionReferenceId:{
    type: String
  },
  thirdPartyTransactionId:{
    type: String
  },
  paymentId: {
    type: String,
    default: null,
  },
  qrWebHookData: {
    type: Object,
    default: null,
  },
});

const PaymentMongoSchema = mongoose.model("Payment", paymentSchema);

module.exports = PaymentMongoSchema;
