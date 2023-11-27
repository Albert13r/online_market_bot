const { Sequelize } = require("sequelize");

module.exports = new Sequelize("online_market_shop_db", "albert", "albert", {
  host: "localhost",
  port: 5432,
  dialect: "postgres",
});