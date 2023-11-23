const pkg = require("node-telegram-bot-api");
const TelegramApi = pkg;
const token = "6819020352:AAGsVr3QCh19tu6ky2bl99j5mvdYhfKfvNs";

const bot = new TelegramApi(token, { polling: true });

const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
  } catch (err) {
    console.log("Database connection error");
  }
};

bot.setMyCommands([
  {
    command: "/start",
    description: "Welcome\nI'm your personal assistant bot",
  },
  { command: "/test", description: "This is the test text" },
]);

bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  const userName = msg.from.username;

  if (text === "/start") {
    return bot.sendMessage(chatId, `Welcome - ${userName}`);
  }
  
  if (text === "/test") {
    return bot.sendMessage(chatId, `some text...`);
  }
});



module.exports = start;
