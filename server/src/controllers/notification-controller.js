const messageNotification = require("../utils/message-notification-event-emitter");
const client = require("../utils/sns-client");
const {
  ConfirmSubscriptionCommand,
  ListSubscriptionsByTopicCommand,
} = require("@aws-sdk/client-sns");

const confirmSubscription = async (body) => {
  const command = new ConfirmSubscriptionCommand({
    TopicArn: process.env.SNS_TOPIC_ARN,
    Token: body.Token,
    AuthenticateOnUnsubscribe: false,
  });

  await client.send(command);
  console.log("Subscribed");
};

const newMessageFromTopic = async (message) => {
  messageNotification.emit("new-message", message);
};

exports.listTopicSubscriptions = async () => {
  const command = new ListSubscriptionsByTopicCommand({
    TopicArn: process.env.SNS_TOPIC_ARN,
  });

  const res = await client.send(command);
  return res.Subscriptions;
};

exports.notificationController = async (req, res) => {
  try {
    const body = req.body;

    switch (body.Type) {
      case "SubscriptionConfirmation":
        await confirmSubscription(body);
        break;
      case "Notification":
        await newMessageFromTopic(body.Message);
        break;
      default:
        break;
    }
  } catch (error) {
    console.log(error);
  } finally {
    return res.status(200).send("ok");
  }
};
