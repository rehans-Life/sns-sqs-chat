const { EventEmitter } = require("node:events");

const messageNotification = new EventEmitter();

module.exports = messageNotification;
