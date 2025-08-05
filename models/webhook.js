const { mongoose } = require("../config/db");
const { Schema } = mongoose;

const webhookSchema = new Schema({
  qrWebHookEvent: {
    type: String,
    default: null,
  },
  qrWebHookPayload: {
    type: Object,
    default: null,
  },
  qrWebHookData: {
    type: Object,
    default: null,
  },
});

const WebhookMongoSchema = mongoose.model("Webhook", webhookSchema);

module.exports = WebhookMongoSchema;
