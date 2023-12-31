const sequelize = require("../db");
const { DataTypes } = require("sequelize");

const User = sequelize.define(
  "user",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false,
    },
    email: { type: DataTypes.STRING, allowNull: true, unique: true },
    phoneNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
  },
  { timestamps: true }
);

const UserSaleAnounce = sequelize.define(
  "user_sale_anounce",
  {
    anounceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
    photoLink: { type: DataTypes.STRING, allowNull: false, unique: false },
    description: { type: DataTypes.STRING, allowNull: false, unique: false },
    price: { type: DataTypes.INTEGER, allowNull: false, unique: false },
    tags: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
  },
  { timestamps: true }
);

User.hasMany(UserSaleAnounce, {
  as: "userSaleAnounce",
});

module.exports = { User, UserSaleAnounce };
