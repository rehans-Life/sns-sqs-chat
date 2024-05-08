const { SNSClient } = require("@aws-sdk/client-sns");

const client = new SNSClient({
  region: "me-south-1",
});

module.exports = client;
