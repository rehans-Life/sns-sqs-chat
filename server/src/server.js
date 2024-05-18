const { createServer } = require("http");

const express = require("express");
const { Server } = require("socket.io");
const { PublishCommand, SubscribeCommand } = require("@aws-sdk/client-sns");
const AWSXRay = require("aws-xray-sdk");
AWSXRay.setContextMissingStrategy("LOG_ERROR");

const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const client = require("./utils/sns-client");
const {
  notificationController,
  listTopicSubscriptions,
} = require("./controllers/notification-controller");
const messageNotification = require("./utils/message-notification-event-emitter");

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URI,
  },
});

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const BACKEND_URI = process.env.BACKEND_URI;
const Message = mongoose.model("Message", new mongoose.Schema(), "messages");

app.use(AWSXRay.express.openSegment(BACKEND_URI));

app.use((req, _, next) => {
  if (req.headers["x-amz-sns-message-type"]) {
    req.headers["content-type"] = "application/json";
  }

  next();
});
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app
  .route("/")
  .get((_, res) => res.status(200).send("Hi, Hello how are you!"))
  .post(notificationController);

app
  .route("/messages")
  .post(async (req, res) => {
    try {
      const body = req.body;

      console.log(body);

      if (!body.username) return res.status(404).send("No Username found");

      const command = new PublishCommand({
        Message: JSON.stringify(body),
        TopicArn: SNS_TOPIC_ARN,
      });

      await client.send(command);

      res.status(200).send("Message Added");
    } catch (error) {
      return res.status(500).send("Internal Server Error");
    }
  })
  .get(async (_, res) => {
    AWSXRay.captureAsyncFunc("mongodb", async function (subsegment) {
      const messages = await Message.find();
      res.status(200).json({
        status: "success",
        data: {
          messages,
        },
      });
    });
  });

io.on("connection", (socket) => {
  function onNewMessage(newMessage) {
    if (socket.connected) {
      socket.emit("new-message", JSON.parse(newMessage));
    }
  }

  messageNotification.on("new-message", onNewMessage);

  socket.on("disconnect", () => {
    messageNotification.removeListener("new-message", onNewMessage);
    socket._cleanup();
    socket.disconnect();
  });
});

app.use(AWSXRay.express.closeSegment());

(async () => {
  await mongoose.connect(
    process.env.MONGO_URI.replace("<password>", process.env.MONGO_PASSWORD)
  );

  io.httpServer.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server listening on PORT ${PORT}`);

    const topicSubscriptions = await listTopicSubscriptions();

    if (
      topicSubscriptions.some((sub) =>
        sub.Endpoint.match(new RegExp(BACKEND_URI))
      )
    ) {
      console.log("You have already subscribed to the SNS topic");
      return;
    }

    console.log("Subscribing to SNS");

    const subscribeCommand = new SubscribeCommand({
      Protocol: "http",
      Endpoint: BACKEND_URI,
      TopicArn: SNS_TOPIC_ARN,
    });

    await client.send(subscribeCommand);
  });
})();
