const pkg = require("node-telegram-bot-api");
const TelegramApi = pkg;
const sequelize = require("./db");
const { User, UserAnounce } = require("./models/online_shop.model");
const infoMessage = require("./message");
const fs = require("fs");
const path = require("path");
const {
  userInfoSchema,
  announceSchmea,
} = require("./validators/telegram.validator");

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
    description: "Інформація про можливості бота",
  },
  { command: "/share_email", description: "Поділитися електронною поштою" },
  {
    command: "/share_phone_number",
    description: "Поділитися номером телефону",
  },
  { command: "/create_announce", description: "Створити оголошення" },
]);

bot.onText(/\/start/, (msg) => {
  const text = `Вітаю - ${msg.from.username}\n\n${infoMessage.infoMessage()}`;
  bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/share_email/, async (msg) => {
  const emailPrompt = await bot.sendMessage(
    msg.chat.id,
    `Будь ласка, введіть адресу вашої електронної пошти:\n`,
    {
      reply_markup: {
        force_reply: true,
      },
    }
  );
  bot.onReplyToMessage(
    msg.chat.id,
    emailPrompt.message_id,
    async (emailMsg) => {
      const email = emailMsg.text;
      const { error, value } = userInfoSchema.validate({ email: email });
      if (error) {
       return bot.sendMessage(
          msg.chat.id,
          `Ваша пошта не відповідає формату\nБудь ласка, спробуйте ще.`
        );
      }
      return bot.sendMessage(msg.chat.id, `Ваша пошта збереженна\n${email}`);
    }
    // save email in db
  );
});

bot.onText(/\/share_phone_number/, async (msg) => {
  const phonePrompt = await bot.sendMessage(
    msg.chat.id,
    `Будь ласка, введіть номер свого телефону у форматі - (0хххххххххх):\n`,
    {
      reply_markup: {
        force_reply: true,
      },
    }
  );
  bot.onReplyToMessage(
    msg.chat.id,
    phonePrompt.message_id,
    async (phoneMsg) => {
      const phone = phoneMsg.text;
      const { error, value } = userInfoSchema.validate({ phone_number: phone });
    if (error) {
      return bot.sendMessage(
        msg.chat.id,
        `Ваша номер телефону не відповідає формату\nБудь ласка, спробуйте ще.`
      );
    }
    return bot.sendMessage(msg.chat.id, `Ваш номер телефону збережено\n${phone}`);
      // save phone in db
    }
  );
});

bot.onText(/\/create_announce/, (msg) => {
  const chatId = msg.chat.id;
  userId = msg.from.id;

  bot.sendMessage(chatId, "Введіть назву продукту:");
  bot.once("text", (titleMsg) => {
    title = titleMsg.text;

    bot.sendMessage(chatId, "Короткий опис продукту:");
    bot.once("text", (descriptionMsg) => {
      description = descriptionMsg.text;

      bot.sendMessage(chatId, "Ціна у гривнях:");
      bot.once("text", (priceMsg) => {
        price = priceMsg.text;

        bot.sendMessage(chatId, "Прикріпіть зображення:");
        bot.once("message", async (photoMsg) => {
          // console.log(photoMsg)
          try {
            const userFolder = path.resolve(__dirname, `media/${msg.from.id}`);

            if (!fs.existsSync(userFolder)) {
              fs.mkdirSync(userFolder, { recursive: true });
            }
            const fileInfo = await bot.getFile(
              photoMsg.photo[photoMsg.photo.length - 1].file_id
            );
            const timestamp = new Date().getTime();
            const uniqueFileName = `photo_${timestamp}.jpg`;

            const fileStream = bot.getFileStream(fileInfo.file_id);

            const finalFilePath = path.join(userFolder, uniqueFileName);

            const writeStream = fs.createWriteStream(finalFilePath);

            fileStream.pipe(writeStream);

            // Ожидаем завершения операции
            await new Promise((resolve) => {
              writeStream.on("finish", resolve);
            });

            const userAnnounce = {
              userId: userId,
              title: title,
              description: description,
              price: price,
              photo: finalFilePath,
            };
            bot.sendPhoto(msg.chat.id, finalFilePath, {
              caption: `"${title}"\n${price} грн\n\n${description}\n`,
            });
            bot.sendPhoto(process.env.CHANNEL_ID, finalFilePath, {
              caption: `"${title}"\n${price} грн\n\n${description}\n`,
            });

            console.log("Photo successfully uploaded with a unique file name");
          } catch (error) {
            console.error(
              "Error occurred during photo upload::",
              error.message
            );
          }
        });
      });
    });
  });
});

module.exports = start;



