const pkg = require("node-telegram-bot-api");
const TelegramApi = pkg;
const sequelize = require("./db");
const { User, UserAnounce } = require("./models/online_shop.model");
const infoMessage = require("./message");
const fs = require("fs");
const path = require("path");

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
    description: "Інформація про можливості бота"
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
    `Вітаю ${msg.from.username}\nБудь ласка, введіть вашу пошту:\n`,
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
      // save email in db
      await bot.sendMessage(msg.chat.id, `Ваша пошта - ${email}`);
    }
  );
});

bot.onText(/\/share_phone_number/, async (msg) => {
  const phonePrompt = await bot.sendMessage(
    msg.chat.id,
    `Вітаю ${msg.from.username}\nБудь ласка, введіть номер свого телефону:\n`,
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
      // save phone in db
      await bot.sendMessage(msg.chat.id, `Ваш номер телефону - ${phone}`);
    }
  );
});


bot.onText(/\/create_announce/, (msg) => {
  const chatId = msg.chat.id;

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
        bot.once('photo', async (photoMsg) => {
          try {
            const userFolder = path.resolve(__dirname, `media/${msg.from.id}`);
        
            // Проверяем существование родительской директории перед созданием
            if (!fs.existsSync(userFolder)) {
              fs.mkdirSync(userFolder, { recursive: true });
            }
        
            // Получаем информацию о файле
            const fileInfo = await bot.getFile(photoMsg.photo[photoMsg.photo.length - 1].file_id);
        
            // Генерируем уникальное имя файла
            const timestamp = new Date().getTime();
            const uniqueFileName = `photo_${timestamp}.jpg`;
        
            // Загружаем файл с помощью getFileStream
            const fileStream = bot.getFileStream(fileInfo.file_id);
            
            const finalFilePath = path.join(userFolder, uniqueFileName);
        
            // Создаем поток для записи файла
            const writeStream = fs.createWriteStream(finalFilePath);
        
            // Переносим данные из fileStream в writeStream
            fileStream.pipe(writeStream);
        
            // Ожидаем завершения операции
            await new Promise((resolve) => {
              writeStream.on('finish', resolve);
            });
        
            console.log('Photo successfully uploaded with a unique file name');
          } catch (error) {
            console.error('Error occurred during photo upload::', error.message);
          }
        });
      });
    });
  });
});

module.exports = start;
