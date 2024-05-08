const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    message_id: {
      type: String,
      required: [true, "SQS message id is required"],
      unique: true,
    },
    username: {
      type: String,
      required: [true, "Cannot add a message without a username"],
      minLength: [1, "Password should have atleast one characters"],
    },
    message: {
      type: String,
      minLength: [1, "Message should have atleast one character"],
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
