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

const announcement = new Map();

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
  {
    command: "/create_announce",
    description: "Створити оголошення ",
  },
  { command: "/share_email", description: "Поділитися електронною поштою" },
  {
    command: "/share_phone_number",
    description: "Поділитися номером телефону",
  },
]);

const sale_steps = [
  {
    id: 1,
    type: "title",
    title: "Введіть назву продукту:",
    dest_id: 2,
  },
  {
    id: 2,
    type: "description",
    title: "Короткий опис продукту:",
    dest_id: 3,
  },
  {
    id: 3,
    type: "price",
    title: "Ціна у гривнях:",
    dest_id: 4,
  },
  {
    id: 4,
    type: "tags",
    title:
      "Введіть через кому  ','  усі ключові слова для вашого продукту.\nНаприклад: JohnDeere, автозапчастини, 4075R",
    dest_id: 5,
  },
  {
    id: 5,
    type: "photo",
    title: "Прикріпіть зображення:",
  },
];

const purchase_steps = [
  {
    id: 1,
    type: "title",
    title: "Введіть назву продукту:",
    dest_id: 2,
  },
  {
    id: 2,
    type: "description",
    title: "Короткий зміст:",
    dest_id: 3,
  },
  {
    id: 3,
    type: "tags",
    title:
      "Введіть через кому  ','  усі ключові слова для вашого продукту.\nНаприклад: JohnDeere, автозапчастини, 4075R",
  },
];

const handlers = {
  title: setTitle,
  description: setDescription,
  price: setPrice,
  photo: setPhoto,
  tags: setTags,
};

function setTitle(titleMsg) {
  const { error } = announceSchmea.validate({ product_title: titleMsg.text });
  if (error) {
    return {
      isError: true,
      msg: "Назва повина містити від 3 до 150 літер",
    };
  }
  return {
    data: {
      title: titleMsg.text,
    },
    isError: false,
  };
}

function setDescription(descMsg) {
  const { error } = announceSchmea.validate({ description: descMsg.text });
  if (error) {
    return {
      isError: true,
      msg: `Опис повинен містити від 10 до 250 літер`,
    };
  }
  return {
    data: {
      description: descMsg.text,
    },
    isError: false,
  };
}

function setPrice(priceMsg) {
  const { error } = announceSchmea.validate({ price: priceMsg.text });
  if (error) {
    return {
      isError: true,
      msg: "Ціна повина бути в межах від 1 до 1000000 грн",
    };
  }
  return {
    data: {
      price: priceMsg.text,
    },
    isError: false,
  };
}

function setTags(tagsMsg) {
  if (!tagsMsg.text) {
    return {
      isError: true,
    };
  }
  return {
    data: {
      tags: tagsMsg.text
        .split(",")
        .map((element) => "#" + element.trim().toLowerCase()),
    },
    isError: false,
  };
}

async function setPhoto(photoMsg) {
  if (!photoMsg.photo) {
    return {
      isError: true,
    };
  }
  try {
    const userFolder = path.resolve(__dirname, `media/${photoMsg.from.id}`);

    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    const fileInfo = await bot.getFile(
      photoMsg.photo[photoMsg.photo.length - 1].file_id
    );
    const timestamp = new Date().getTime();
    const uniqueFileName = `photo_${timestamp}.jpg`;

    const fileStream = bot.getFileStream(fileInfo.file_id);

    const finalFilePath = path.resolve(userFolder, uniqueFileName);

    const writeStream = fs.createWriteStream(finalFilePath);

    fileStream.pipe(writeStream);

    // Ожидаем завершения операции
    await new Promise((resolve) => {
      writeStream.on("finish", resolve);
    });

    /// тут пост должен добавляться в очередь

    // bot.sendPhoto(process.env.CHANNEL_ID, finalFilePath, {
    //   caption: `"${title}"\n${price} грн\n\n${description}\n\n${tags}`,
    // });
    console.log("Photo successfully uploaded with a unique file name");
    return {
      data: {
        photoLink: finalFilePath,
      },
      isError: false,
    };
  } catch (error) {
    console.error("Error occurred during photo upload:", error.message);
    return {
      isError: true,
    };
  }
}

bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id;
  try {
    const user = await User.findOne({
      where: { userId: userId },
    });
    if (!user) {
      await User.create({
        userId: userId,
      });
    }
    const text = `Вітаю - ${
      msg.from.first_name || msg.from.second_name || msg.from.username
    }\n\n${infoMessage.infoMessage()}`;
    bot.sendMessage(msg.chat.id, text);
  } catch (error) {
    console.error(error);
  }
});

bot.onText(/\/share_email/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
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
      const { error } = userInfoSchema.validate({ email: email });
      if (error) {
        return bot.sendMessage(
          msg.chat.id,
          `Ваша пошта не відповідає формату\nБудь ласка, спробуйте ще.`
        );
      }
      try {
        const user = await User.findOne({
          where: { email: email },
        });

        if (user && user.dataValues.userId !== userId) {
          return bot.sendMessage(
            chatId,
            "Ваша електронна пошта вже була зареєстрована!"
          );
        }
        await User.update(
          {
            email: email,
          },
          {
            where: {
              userId: userId,
            },
          }
        );
        return bot.sendMessage(
          chatId,
          `Ваша електронна пошта ${email} збережена!`
        );
      } catch (error) {
        console.error(error);
      }
    }
  );
});

bot.onText(/\/share_phone_number/, async (msg) => {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
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
      const { error } = userInfoSchema.validate({ phone_number: phone });
      if (error) {
        return bot.sendMessage(
          msg.chat.id,
          `Ваша номер телефону не відповідає формату\nБудь ласка, спробуйте ще.`
        );
      }
      try {
        const user = await User.findOne({
          where: { phoneNumber: phone },
        });
        if (user && user.dataValues.userId !== userId) {
          return bot.sendMessage(
            chatId,
            `Цей номер телефону вже зареєстрований!`
          );
        }
        await User.update(
          {
            phoneNumber: phone,
          },
          {
            where: {
              userId: userId,
            },
          }
        );
        return bot.sendMessage(
          chatId,
          `Ваш номер телефону ${phone} збережено!`
        );
      } catch (error) {
        console.error(error);
      }
    }
  );
});
bot.onText(/\/create_announce/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const announcement_keyboard = {
    reply_markup: {
      keyboard: [[{ text: "Купівля" }], [{ text: "Продаж" }]],
      one_time_keyboard: true,
    },
  };
  bot.sendMessage(
    chatId,
    "Оберіть будь ласка тип оголошення:",
    announcement_keyboard
  );
  bot.once("message", (msg) => {
    const messageText = msg.text;
    if (messageText === "Купівля") {
      execution(purchase_steps, purchase_steps[0]);

      function execution(steps, currentStep, errTitle) {
        bot.sendMessage(chatId, errTitle ?? currentStep.title);
        bot.once("message", async (msg) => {
          const response = await handlers[currentStep.type](msg);

          if (response.isError) {
            return execution(steps, currentStep, response.msg);
          }
          let currentAnnauncment = announcement.get(userId);

          currentAnnauncment = {
            ...(currentAnnauncment ?? {}),
            ...response.data,
          };
          announcement.set(userId, currentAnnauncment);

          if (!currentStep.dest_id) {
            await UserAnounce.create({
              ...currentAnnauncment,
              userUserId: userId,
              announceType: "purchase",
            });
            bot.sendMessage(
              chatId,
              `"${currentAnnauncment.title}"\n\n${
                currentAnnauncment.description
              }\n\n${currentAnnauncment.tags.join(" ")}`
            );
            announcement.delete(userId);
            return;
          }
          const nextStep = steps.find(
            (step) => step.id === currentStep.dest_id
          );
          return execution(steps, nextStep);
        });
      }
    } else if (messageText === "Продаж") {
      execution(sale_steps, sale_steps[0]);

      function execution(steps, currentStep, errTitle) {
        bot.sendMessage(chatId, errTitle ?? currentStep.title);
        bot.once("message", async (msg) => {
          const response = await handlers[currentStep.type](msg);

          if (response.isError) {
            return execution(steps, currentStep, response.msg);
          }
          let currentAnnauncment = announcement.get(userId);

          currentAnnauncment = {
            ...(currentAnnauncment ?? {}),
            ...response.data,
          };
          announcement.set(userId, currentAnnauncment);

          if (!currentStep.dest_id) {
            await UserAnounce.create({
              ...currentAnnauncment,
              userUserId: userId,
              announceType: "sale",
            });
            bot.sendPhoto(chatId, currentAnnauncment.photoLink, {
              caption: `"${currentAnnauncment.title}"\n${
                currentAnnauncment.price
              } грн\n\n${
                currentAnnauncment.description
              }\n\n${currentAnnauncment.tags.join(" ")}`,
            });
            announcement.delete(userId);
            return;
          }
          const nextStep = steps.find(
            (step) => step.id === currentStep.dest_id
          );
          return execution(steps, nextStep);
        });
      }
    }
  });
});

module.exports = start;
