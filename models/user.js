const { mongoose } = require("../config/db");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: String,
  email: String,
  contact: String,
  payments: [{
    type: Schema.Types.ObjectId,
    ref: "Payment",
  }],
});

const UserMongoSchema = mongoose.model("User", userSchema);

module.exports = UserMongoSchema;
