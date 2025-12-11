const state = {
  token: null,
  user: null,
  products: [],
  cart: [],
  categories: new Set(),
};

const api = async (path, options = {}) => {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Помилка запиту');
  }
  return res.json();
};

const loginForm = document.getElementById('login-form');
const baristaPanel = document.getElementById('barista-panel');
const adminPanel = document.getElementById('admin-panel');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout');
const showLoginBtn = document.getElementById('show-login');
const categoryFilter = document.getElementById('category-filter');
const productList = document.getElementById('product-list');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const paymentMethod = document.getElementById('payment-method');
const submitOrder = document.getElementById('submit-order');
const inventoryTable = document.getElementById('inventory-table');
const loginSection = document.getElementById('login-section');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const payload = {
      phone: document.getElementById('phone').value,
      password: document.getElementById('password').value,
    };
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    state.token = data.token;
    state.user = data.user;
    loginSection.classList.add('hidden');
    updateHeader();
    if (state.user.role === 'Barista') baristaPanel.classList.remove('hidden');
    if (state.user.role === 'Admin') adminPanel.classList.remove('hidden');
    await loadProducts();
    await loadInventory();
    if (state.user.role === 'Admin') loadReport();
  } catch (err) {
    alert(err.message);
  }
});

showLoginBtn.addEventListener('click', () => {
  loginSection.classList.remove('hidden');
});

logoutBtn.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  state.cart = [];
  baristaPanel.classList.add('hidden');
  adminPanel.classList.add('hidden');
  loginSection.classList.remove('hidden');
  renderCart();
  updateHeader();
});

function updateHeader() {
  if (state.user) {
    userInfo.textContent = `${state.user.name} (${state.user.role})`;
    logoutBtn.classList.remove('hidden');
    showLoginBtn.classList.add('hidden');
  } else {
    userInfo.textContent = '';
    logoutBtn.classList.add('hidden');
    showLoginBtn.classList.remove('hidden');
  }
}

async function loadProducts() {
  const categoryId = categoryFilter.value || '';
  const products = await api(`/api/products${categoryId ? `?category_id=${categoryId}` : ''}`);
  state.products = products;
  state.categories = new Set(products.map((p) => p.category_id));
  renderFilters();
  renderProducts();
}

function renderFilters() {
  categoryFilter.innerHTML = '<option value="">Всі</option>';
  [...state.categories].forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `Категорія #${id}`;
    categoryFilter.appendChild(opt);
  });
}

function renderProducts() {
  productList.innerHTML = '';
  state.products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'card';
    const available = p.max_available ?? 0;
    card.innerHTML = `
      <h4>${p.name}</h4>
      <p>${p.description || ''}</p>
      <div class="price">${p.price} грн</div>
      <div class="stock">Доступно: ${available}</div>
      <button ${available <= 0 ? 'disabled' : ''}>Додати</button>
    `;
    card.querySelector('button').addEventListener('click', () => addToCart(p));
    productList.appendChild(card);
  });
}

function addToCart(product) {
  const existing = state.cart.find((i) => i.product_id === product.product_id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ product_id: product.product_id, name: product.name, price: product.price, quantity: 1 });
  }
  renderCart();
}

function renderCart() {
  cartItems.innerHTML = '';
  let total = 0;
  state.cart.forEach((item) => {
    total += item.price * item.quantity;
    const li = document.createElement('li');
    li.innerHTML = `${item.name} x ${item.quantity} <button data-id="${item.product_id}">-</button>`;
    li.querySelector('button').addEventListener('click', () => removeFromCart(item.product_id));
    cartItems.appendChild(li);
  });
  cartTotal.textContent = `${total.toFixed(2)} грн`;
}

function removeFromCart(id) {
  state.cart = state.cart.filter((i) => i.product_id !== id);
  renderCart();
}

submitOrder.addEventListener('click', async () => {
  if (!state.cart.length) return alert('Кошик порожній');
  try {
    await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: state.cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: paymentMethod.value,
      }),
    });
    alert('Замовлення оформлено');
    state.cart = [];
    renderCart();
    await loadInventory();
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
});

async function loadInventory() {
  const items = await api('/api/ingredients');
  inventoryTable.innerHTML = '<tr><th>Назва</th><th>Кількість</th><th>Поріг</th></tr>';
  items.forEach((i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i.name}</td><td>${i.current_stock} ${i.unit}</td><td>${i.warning_threshold}</td>`;
    if (i.current_stock <= i.warning_threshold) tr.classList.add('warn');
    inventoryTable.appendChild(tr);
  });
}

categoryFilter.addEventListener('change', loadProducts);

// Admin actions
const ingredientForm = document.getElementById('ingredient-form');
const productForm = document.getElementById('product-form');
const employeeForm = document.getElementById('employee-form');
const reportPeriod = document.getElementById('report-period');
const reportOutput = document.getElementById('report-output');
const loadReportBtn = document.getElementById('load-report');

ingredientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('ing-name').value,
        current_stock: parseFloat(document.getElementById('ing-qty').value),
        unit: document.getElementById('ing-unit').value,
        warning_threshold: parseFloat(document.getElementById('ing-warning').value || '0'),
      }),
    });
    alert('Створено');
    ingredientForm.reset();
    loadInventory();
  } catch (err) {
    alert(err.message);
  }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('prod-name').value,
        category_id: parseInt(document.getElementById('prod-category').value, 10),
        price: parseFloat(document.getElementById('prod-price').value),
        description: document.getElementById('prod-desc').value,
      }),
    });
    alert('Продукт створено');
    productForm.reset();
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
});

employeeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('emp-name').value,
        phone: document.getElementById('emp-phone').value,
        password: document.getElementById('emp-password').value,
        role: document.getElementById('emp-role').value,
      }),
    });
    alert('Співробітника створено');
    employeeForm.reset();
  } catch (err) {
    alert(err.message);
  }
});

async function loadReport() {
  try {
    const data = await api(`/api/reports/sales?period=${reportPeriod.value}`);
    reportOutput.textContent = `Сума: ${data.total || 0}, чеків: ${data.count || 0}`;
  } catch (err) {
    reportOutput.textContent = err.message;
  }
}

loadReportBtn.addEventListener('click', loadReport);

updateHeader();
