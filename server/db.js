const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const databasePath = path.join(dataDir, 'coffee_shop.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: databasePath,
  logging: false,
});

module.exports = { sequelize };
