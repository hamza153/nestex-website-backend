const mongoose = require("mongoose");
require("dotenv").config();

const DBConnectionMongo = () => {
  mongoose.connect(process.env.MONGO_DATABASE_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = mongoose.connection;
  return db;
};

module.exports = { DBConnectionMongo, mongoose };
