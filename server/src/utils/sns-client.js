const { SNSClient } = require("@aws-sdk/client-sns");
const AWSXRay = require("aws-xray-sdk");

const client = AWSXRay.captureAWSv3Client(
  new SNSClient({
    region: "me-south-1",
  })
);

module.exports = client;
