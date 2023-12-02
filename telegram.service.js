const pkg = require("node-telegram-bot-api");
const TelegramApi = pkg;
const sequelize = require("./db");
const { User, UserAnounce } = require("./models/online_shop.model");
const infoMessage = require("./message");

require("dotenv").config();

const token = process.env.BOT_TOKEN;

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
  { command: "/share_email", description: "Share or edit your email" },
  { command: "/share_phone_number", description: "Share or edit your phone number" },
]);


  bot.onText(/\/start/, (msg)=> {
    const text = `Weclome - ${msg.from.username}\n\n${infoMessage.infoMessage()}`
    bot.sendMessage(msg.chat.id,text)
})
bot.onText(/\/share_email/, async msg => {
  const emailPrompt = await bot.sendMessage(msg.chat.id, `Hello ${msg.from.username}\nPlease write your email:\n`, {
      reply_markup: {
          force_reply: true,
      },
  });
  bot.onReplyToMessage(msg.chat.id, emailPrompt.message_id, async (emailMsg) => {
      const email = emailMsg.text;
      // save email in db
      await bot.sendMessage(msg.chat.id, `Your email - ${email}`);
  });
});

bot.onText(/\/share_phone_number/, async msg => {
  const phonePrompt = await bot.sendMessage(msg.chat.id, `Hello ${msg.from.username}\nPlease write your phone number:\n`, {
      reply_markup: {
          force_reply: true,
      },
  });
  bot.onReplyToMessage(msg.chat.id, phonePrompt.message_id, async (phoneMsg) => {
      const phone = phoneMsg.text;
      // save phone in db
      await bot.sendMessage(msg.chat.id, `Your phone number - ${phone}`);
  });
});

module.exports = start;
