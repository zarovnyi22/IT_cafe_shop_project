const path = require('path');
const { Sequelize } = require('sequelize');

const databasePath = path.join(__dirname, '..', 'data', 'coffee_shop.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: databasePath,
  logging: false,
});

module.exports = { sequelize };
