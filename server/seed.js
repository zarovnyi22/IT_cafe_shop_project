const bcrypt = require('bcryptjs');
const {
  Category,
  Employee,
  Ingredient,
  Product,
  Recipe,
  Supply,
  Order,
  OrderDetail,
  sequelize,
} = require('./models');

async function seedDatabase() {
  await sequelize.sync({ force: true });

  const categories = await Category.bulkCreate([
    { name: 'Кава' },
    { name: 'Чаї та Напої' },
    { name: 'Десерти' },
    { name: 'Випічка' },
  ]);

  const ingredients = await Ingredient.bulkCreate([
    { name: 'Зерно Арабіка 100%', current_stock: 10.0, unit: 'kg', warning_threshold: 1.0 },
    { name: 'Зерно Бленд', current_stock: 5.0, unit: 'kg', warning_threshold: 0.5 },
    { name: 'Молоко 2.5%', current_stock: 40.0, unit: 'l', warning_threshold: 5.0 },
    { name: 'Молоко Безлактозне', current_stock: 10.0, unit: 'l', warning_threshold: 2.0 },
    { name: 'Сироп Карамель', current_stock: 5.0, unit: 'l', warning_threshold: 0.5 },
    { name: 'Чай Ерл Грей', current_stock: 2.0, unit: 'kg', warning_threshold: 0.2 },
    { name: 'Стакан паперовий S', current_stock: 500.0, unit: 'pcs', warning_threshold: 50.0 },
    { name: 'Стакан паперовий L', current_stock: 500.0, unit: 'pcs', warning_threshold: 50.0 },
    { name: 'Круасан (заморозка)', current_stock: 100.0, unit: 'pcs', warning_threshold: 10.0 },
    { name: 'Цукор стік', current_stock: 1000.0, unit: 'pcs', warning_threshold: 100.0 },
  ]);

  const [admin, barista] = await Employee.bulkCreate([
    { name: 'Олена Адмін', role: 'Admin', phone: '+380991234567', password_hash: bcrypt.hashSync('admin123', 10) },
    { name: 'Іван Бариста', role: 'Barista', phone: '+380997654321', password_hash: bcrypt.hashSync('barista123', 10) },
    { name: 'Петро Стажер', role: 'Barista', phone: '+380630000000', password_hash: bcrypt.hashSync('barista123', 10) },
  ]);

  const products = await Product.bulkCreate([
    { category_id: categories[0].category_id, name: 'Еспресо', description: 'Класичний шот, 30мл', price: 40.0 },
    { category_id: categories[0].category_id, name: 'Американо', description: 'Еспресо з гарячою водою', price: 45.0 },
    { category_id: categories[0].category_id, name: 'Капучино', description: 'Еспресо + спінене молоко', price: 60.0 },
    { category_id: categories[0].category_id, name: 'Лате', description: 'Багато молока, трохи кави', price: 65.0 },
    { category_id: categories[0].category_id, name: 'Лате Карамель', description: 'Солодкий лате з сиропом', price: 75.0 },
    { category_id: categories[1].category_id, name: 'Чай Чорний', description: 'Класичний Ерл Грей', price: 35.0 },
    { category_id: categories[3].category_id, name: 'Круасан класичний', description: 'Французька випічка', price: 55.0 },
    { category_id: categories[2].category_id, name: 'Чізкейк', description: 'Нью-Йорк', price: 90.0 },
  ]);

  await Recipe.bulkCreate([
    { product_id: products[0].product_id, ingredient_id: ingredients[0].ingredient_id, quantity_required: 0.02 },
    { product_id: products[0].product_id, ingredient_id: ingredients[6].ingredient_id, quantity_required: 1.0 },
    { product_id: products[1].product_id, ingredient_id: ingredients[0].ingredient_id, quantity_required: 0.02 },
    { product_id: products[1].product_id, ingredient_id: ingredients[7].ingredient_id, quantity_required: 1.0 },
    { product_id: products[2].product_id, ingredient_id: ingredients[0].ingredient_id, quantity_required: 0.02 },
    { product_id: products[2].product_id, ingredient_id: ingredients[2].ingredient_id, quantity_required: 0.15 },
    { product_id: products[2].product_id, ingredient_id: ingredients[6].ingredient_id, quantity_required: 1.0 },
    { product_id: products[3].product_id, ingredient_id: ingredients[0].ingredient_id, quantity_required: 0.02 },
    { product_id: products[3].product_id, ingredient_id: ingredients[2].ingredient_id, quantity_required: 0.25 },
    { product_id: products[3].product_id, ingredient_id: ingredients[7].ingredient_id, quantity_required: 1.0 },
    { product_id: products[4].product_id, ingredient_id: ingredients[0].ingredient_id, quantity_required: 0.02 },
    { product_id: products[4].product_id, ingredient_id: ingredients[2].ingredient_id, quantity_required: 0.25 },
    { product_id: products[4].product_id, ingredient_id: ingredients[4].ingredient_id, quantity_required: 0.02 },
    { product_id: products[4].product_id, ingredient_id: ingredients[7].ingredient_id, quantity_required: 1.0 },
    { product_id: products[5].product_id, ingredient_id: ingredients[5].ingredient_id, quantity_required: 0.01 },
    { product_id: products[5].product_id, ingredient_id: ingredients[7].ingredient_id, quantity_required: 1.0 },
    { product_id: products[6].product_id, ingredient_id: ingredients[8].ingredient_id, quantity_required: 1.0 },
  ]);

  await Supply.bulkCreate([
    { ingredient_id: ingredients[0].ingredient_id, quantity_added: 10.0, cost: 4500.0 },
    { ingredient_id: ingredients[2].ingredient_id, quantity_added: 50.0, cost: 1500.0 },
    { ingredient_id: ingredients[6].ingredient_id, quantity_added: 1000.0, cost: 2000.0 },
  ]);

  const order1 = await Order.create({ employee_id: barista.employee_id, total_amount: 45.0, payment_method: 'Cash', status: 'Paid' });
  await OrderDetail.create({ order_id: order1.order_id, product_id: products[1].product_id, quantity: 1, price_at_sale: 45.0 });

  const order2 = await Order.create({ employee_id: 3, total_amount: 130.0, payment_method: 'Card', status: 'Paid' });
  await OrderDetail.bulkCreate([
    { order_id: order2.order_id, product_id: products[4].product_id, quantity: 1, price_at_sale: 75.0 },
    { order_id: order2.order_id, product_id: products[6].product_id, quantity: 1, price_at_sale: 55.0 },
  ]);

  const order3 = await Order.create({ employee_id: barista.employee_id, total_amount: 255.0, payment_method: 'App', status: 'Paid' });
  await OrderDetail.bulkCreate([
    { order_id: order3.order_id, product_id: products[2].product_id, quantity: 2, price_at_sale: 60.0 },
    { order_id: order3.order_id, product_id: products[7].product_id, quantity: 1, price_at_sale: 90.0 },
    { order_id: order3.order_id, product_id: products[1].product_id, quantity: 1, price_at_sale: 45.0 },
  ]);
}

module.exports = { seedDatabase };
