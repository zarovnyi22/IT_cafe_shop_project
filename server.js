const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { signToken, authMiddleware, requireRole } = require('./server/auth');
const {
  Category,
  Employee,
  Ingredient,
  Product,
  Recipe,
  Order,
  OrderDetail,
  sequelize,
} = require('./server/models');
const { seedDatabase } = require('./server/seed');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

async function ensureData() {
  const tables = await sequelize.getQueryInterface().showAllTables();
  if (!tables || tables.length === 0) {
    await seedDatabase();
    return;
  }
  const employeeCount = await Employee.count();
  if (employeeCount === 0) {
    await seedDatabase();
  }
}

app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;
  const user = await Employee.findOne({ where: { phone } });
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Невірний телефон або пароль' });
  }
  const token = signToken({ id: user.employee_id, role: user.role, name: user.name });
  res.json({ token, employee: { id: user.employee_id, name: user.name, role: user.role } });
});

app.get('/api/products', authMiddleware, async (_req, res) => {
  const products = await Product.findAll({
    where: { is_active: true },
    include: [{ model: Category, attributes: ['name'] }],
    order: [['product_id', 'ASC']],
  });
  res.json(products);
});

app.post('/api/products', authMiddleware, requireRole('Admin'), async (req, res) => {
  const { name, description, price, category_id } = req.body;
  const created = await Product.create({ name, description, price, category_id, is_active: true });
  res.status(201).json(created);
});

app.get('/api/ingredients', authMiddleware, async (_req, res) => {
  const ingredients = await Ingredient.findAll({ order: [['ingredient_id', 'ASC']] });
  res.json(ingredients.map((item) => ({ ...item.toJSON(), low: Number(item.current_stock) <= Number(item.warning_threshold) })));
});

app.post('/api/ingredients', authMiddleware, requireRole('Admin'), async (req, res) => {
  const created = await Ingredient.create(req.body);
  res.status(201).json(created);
});

app.post('/api/employees', authMiddleware, requireRole('Admin'), async (req, res) => {
  const { name, phone, role, password } = req.body;
  const existing = await Employee.findOne({ where: { phone } });
  if (existing) {
    return res.status(400).json({ error: 'Співробітник з таким телефоном вже існує' });
  }
  const employee = await Employee.create({ name, phone, role, password_hash: bcrypt.hashSync(password || 'changeme', 10) });
  res.status(201).json({ id: employee.employee_id, name: employee.name, role: employee.role, phone: employee.phone });
});

async function canFulfill(items) {
  const grouped = new Map();
  for (const item of items) {
    const recipes = await Recipe.findAll({ where: { product_id: item.productId } });
    for (const r of recipes) {
      const needed = Number(r.quantity_required) * Number(item.quantity || 1);
      const current = grouped.get(r.ingredient_id) || 0;
      grouped.set(r.ingredient_id, current + needed);
    }
  }
  for (const [ingredientId, required] of grouped.entries()) {
    const ing = await Ingredient.findByPk(ingredientId);
    if (!ing || Number(ing.current_stock) < required) {
      return { ok: false, missing: ing ? ing.name : `#${ingredientId}` };
    }
  }
  return { ok: true };
}

app.post('/api/orders', authMiddleware, async (req, res) => {
  const { items = [], payment_method = 'Card' } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Немає товарів у замовленні' });
  }

  const check = await canFulfill(items);
  if (!check.ok) {
    return res.status(400).json({ error: `Недостатньо інгредієнтів: ${check.missing}` });
  }

  const total = await Promise.all(items.map(async (item) => {
    const product = await Product.findByPk(item.productId);
    return Number(product.price) * Number(item.quantity || 1);
  }));
  const totalAmount = total.reduce((a, b) => a + b, 0);

  const tx = await sequelize.transaction();
  try {
    const order = await Order.create({
      employee_id: req.user.id,
      total_amount: totalAmount,
      payment_method,
      status: 'Paid',
    }, { transaction: tx });

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction: tx });
      await OrderDetail.create({
        order_id: order.order_id,
        product_id: product.product_id,
        quantity: item.quantity || 1,
        price_at_sale: product.price,
      }, { transaction: tx });

      const recipes = await Recipe.findAll({ where: { product_id: product.product_id }, transaction: tx });
      for (const r of recipes) {
        const ing = await Ingredient.findByPk(r.ingredient_id, { transaction: tx });
        const newStock = Number(ing.current_stock) - Number(r.quantity_required) * Number(item.quantity || 1);
        ing.current_stock = newStock;
        await ing.save({ transaction: tx });
      }
    }

    await tx.commit();
    res.status(201).json({ message: 'Замовлення збережено', order_id: order.order_id });
  } catch (err) {
    await tx.rollback();
    res.status(500).json({ error: 'Помилка створення замовлення', details: err.message });
  }
});

app.get('/api/reports/sales', authMiddleware, requireRole('Admin'), async (req, res) => {
  const period = req.query.period || 'day';
  const now = new Date();
  let start = new Date(now);
  if (period === 'week') {
    start.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    start.setMonth(now.getMonth() - 1);
  } else {
    start.setDate(now.getDate() - 1);
  }
  const orders = await Order.findAll({
    where: { order_date: { [Op.gte]: start } },
    include: [OrderDetail],
    order: [['order_date', 'DESC']],
  });
  const total = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  res.json({ total, orders });
});

app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await Employee.findByPk(req.user.id);
  res.json({ id: user.employee_id, name: user.name, role: user.role });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8000;

ensureData().then(() => {
  app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
});
