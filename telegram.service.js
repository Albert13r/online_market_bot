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

const steps = [
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
    type: "photo",
    title: "Прикріпіть зображення:",
  },
];

const handlers = {
  title: setTitle,
  description: setDescription,
  price: setPrice,
  photo: setPhoto,
};

function setTitle(titleMsg) {
  const { error } = announceSchmea.validate({ product_title: titleMsg.text });
  if (error) {
    return {
      isError: true,
      msg: "Назва повина містити від 3 до 150 літер",
    };
  }
  title = titleMsg.text;
  return {
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
  description = descMsg.text;
  return {
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
  price = priceMsg.text;
  return {
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

    const userAnnounce = {
      userId: userId,
      title: title,
      description: description,
      price: price,
      photo: finalFilePath,
    };

    bot.sendPhoto(photoMsg.chat.id, finalFilePath, {
      caption: `"${title}"\n${price} грн\n\n${description}\n`,
    });

    /// тут пост должен добавляться в очередь

    bot.sendPhoto(process.env.CHANNEL_ID, finalFilePath, {
      caption: `"${title}"\n${price} грн\n\n${description}\n`,
    });

    console.log("Photo successfully uploaded with a unique file name");
  } catch (error) {
    console.error("Error occurred during photo upload:", error.message);
  }

  return {
    isError: false,
  };
}

bot.onText(/\/start/, async (msg) => {
  const userName = msg.from.username
  if(!userName){
    bot.sendMessage(
      msg.chat.id,
      `Щоб користуватися всіма можливостями нашої платформи, ви повинні мати "ім'я користувача" у своєму телеграм-біографії або ви можете поділитися з нами своїм номером телефону/електронною поштою`
    );
  }
  try{
    const user = await User.findOne({
      where: { username: userName },
    });
    if (!user) {
      const newUser = await User.create({
        username: userName
      })
    }
    const text = `Вітаю - ${msg.from.username}\n\n${infoMessage.infoMessage()}`;
    bot.sendMessage(msg.chat.id, text);
  }
  catch(error){
    console.error(error)
  }
});

bot.onText(/\/share_email/, async (msg) => {
  const chatId = msg.chat.id
  const userName = msg.from.username
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
      try{
        const user = await User.findOne({
          where: { username: userName },
        });
        if (!user) {
          const newUser = await User.create({
            username: userName
          })
        }
        if( user.dataValues.email === email ){
          return  bot.sendMessage(chatId, 'Ваша електронна пошта вже була зареєстрована!')
        }
        await User.update({
          email: email
        },{
          where: {
            username: userName
          }
        })
        return bot.sendMessage(chatId, `Ваша електронна пошта ${email} збережена!`)
      }
      catch(error){
        console.error(error)
      }
    }
  );
});

bot.onText(/\/share_phone_number/, async (msg) => {
  const chatId = msg.chat.id
  const userName = msg.from.username
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
      try{
        const user = await User.findOne({
          where: { username: userName },
        });
        if (!user) {
          const newUser = await User.create({
            username: userName
          })
        }
        if( user.dataValues.phoneNumber === phone ){
         return bot.sendMessage(chatId, 'Ваш номер телефону вже був зареєстрований!')
        }
        await User.update({
          phoneNumber: phone
        },{
          where: {
            username: userName
          }
        })
        return bot.sendMessage(chatId, `Ваш номер телефону ${phone} збережено!`)
      }
      catch(error){
        console.error(error)
      }
      // save phone in db
    }
  );
});

bot.onText(/\/create_announce/, (msg) => {
  const chatId = msg.chat.id;
  userId = msg.from.id;
  execution(steps, steps[0]);

  function execution(steps, currentStep, errTitle) {
    bot.sendMessage(chatId, errTitle ?? currentStep.title);
    bot.once("message", async (msg) => {
      const response = await handlers[currentStep.type](msg);

      if (response.isError) {
        return execution(steps, currentStep, response.msg);
      }
      if (!currentStep.dest_id) {
        return;
      }
      const nextStep = steps.find((step) => step.id === currentStep.dest_id);
      return execution(steps, nextStep);
    });
  }
});

module.exports = start;
