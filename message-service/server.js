const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
} = require("@aws-sdk/client-sqs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Message = require("./models/Message");
const AWSXRay = require("aws-xray-sdk");
AWSXRay.setContextMissingStrategy("IGNORE_ERROR");

const segment = new AWSXRay.Segment("message-service");
const ns = AWSXRay.getNamespace();

dotenv.config({});

const QUEUE_URL = process.env.QUEUE_URL;

const client = AWSXRay.captureAWSv3Client(
  new SQSClient({
    region: "me-south-1",
  })
);

async function poll() {
  try {
    console.log("Poll");

    const recieveCommand = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      AttributeNames: ["All"],
      MaxNumberOfMessages: 10,
    });

    const response = await client.send(recieveCommand);

    const messages = response.Messages?.map((msg) => {
      const msgBody = JSON.parse(msg.Body);
      msgBody.message_id = msg.MessageId;
      return msgBody;
    });

    if (!messages || !messages.length) return;

    console.log(response.Messages);
    console.log(messages);

    const insertedMessages = await Message.insertMany(messages, {
      ordered: false,
    });

    if (!insertedMessages.length) return;

    const deleteCommand = new DeleteMessageBatchCommand({
      QueueUrl: QUEUE_URL,
      Entries: insertedMessages?.map(({ message_id }) => {
        return {
          Id: message_id,
          ReceiptHandle: response.Messages.find(
            ({ MessageId }) => MessageId == message_id
          ).ReceiptHandle,
        };
      }),
    });

    const resp = await client.send(deleteCommand);

    if (resp.Failed && resp.Failed?.length) {
      await Message.deleteMany({
        message_id: {
          $in: resp.Failed?.map((failedDelete) => failedDelete.Id),
        },
      });
    }
    segment.close();
  } catch (error) {
    console.log(error);
    segment.close(error);
  }
}

(async () => {
  await mongoose.connect(
    process.env.MONGO_URI.replace("<password>", process.env.MONGO_PASSWORD)
  );

  while (true) await ns.runAndReturn(poll);
})();
