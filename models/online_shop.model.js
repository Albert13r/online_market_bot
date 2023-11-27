const sequelize = require("../db");
const { DataTypes } = require("sequelize");


const User = sequelize.define("user", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phoneNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
}, {timestamps: true})

const UserAnounce = sequelize.define("user_anounce", {
  anounceId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  photoLink: {type: DataTypes.STRING, allowNull:true, unique: false},
  description: {type: DataTypes.STRING, allowNull:false, unique: false},
  price: {type: DataTypes.INTEGER, allowNull:false, unique: false},
  currency: {type: DataTypes.STRING, allowNull:false, unique: false},
  tags: {type: DataTypes.ARRAY(DataTypes.STRING)}
}, {timestamps: true})


User.hasMany(UserAnounce, {
  as: "userAnounce",
});


module.exports = { User, UserAnounce}