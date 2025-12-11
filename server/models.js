const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Category = sequelize.define('Category', {
  category_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'categories', timestamps: false });

const Employee = sequelize.define('Employee', {
  employee_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('Barista', 'Admin'), allowNull: false },
  phone: { type: DataTypes.STRING },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'employees', timestamps: false });

const Ingredient = sequelize.define('Ingredient', {
  ingredient_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  current_stock: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
  unit: { type: DataTypes.STRING, allowNull: false },
  warning_threshold: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
}, { tableName: 'ingredients', timestamps: false });

const Product = sequelize.define('Product', {
  product_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'products', timestamps: false });

const Recipe = sequelize.define('Recipe', {
  recipe_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  ingredient_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity_required: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: 'recipes', timestamps: false });

const Supply = sequelize.define('Supply', {
  supply_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ingredient_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity_added: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  cost: { type: DataTypes.DECIMAL(10, 2) },
  supply_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'supplies', timestamps: false });

const Order = sequelize.define('Order', {
  order_id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  order_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_method: { type: DataTypes.ENUM('Cash', 'Card', 'App'), defaultValue: 'Card' },
  status: { type: DataTypes.ENUM('Paid', 'Cancelled'), defaultValue: 'Paid' },
}, { tableName: 'orders', timestamps: false });

const OrderDetail = sequelize.define('OrderDetail', {
  detail_id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.BIGINT, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  price_at_sale: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { tableName: 'order_details', timestamps: false });

Category.hasMany(Product, { foreignKey: 'category_id' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

Product.hasMany(Recipe, { foreignKey: 'product_id' });
Recipe.belongsTo(Product, { foreignKey: 'product_id' });

Ingredient.hasMany(Recipe, { foreignKey: 'ingredient_id' });
Recipe.belongsTo(Ingredient, { foreignKey: 'ingredient_id' });

Ingredient.hasMany(Supply, { foreignKey: 'ingredient_id' });
Supply.belongsTo(Ingredient, { foreignKey: 'ingredient_id' });

Employee.hasMany(Order, { foreignKey: 'employee_id' });
Order.belongsTo(Employee, { foreignKey: 'employee_id' });

Order.hasMany(OrderDetail, { foreignKey: 'order_id' });
OrderDetail.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(OrderDetail, { foreignKey: 'product_id' });
OrderDetail.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = {
  Category,
  Employee,
  Ingredient,
  Product,
  Recipe,
  Supply,
  Order,
  OrderDetail,
  sequelize,
};
