import { useEffect, useState } from 'react';
import * as api from './api';

const paymentOptions = ['Card', 'Cash', 'App'];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [payment, setPayment] = useState('Card');
  const [newEmployee, setNewEmployee] = useState({ name: '', phone: '', password: '', role: 'Barista' });
  const [employees, setEmployees] = useState([]);
  const [report, setReport] = useState({ total: 0, orders: [] });
  const [reportPeriod, setReportPeriod] = useState('day');
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category_id: '' });
  const [categoryName, setCategoryName] = useState('');
  const [recipeForm, setRecipeForm] = useState({ productId: '', text: '' });
  const [orders, setOrders] = useState([]);
  const [inventoryEdits, setInventoryEdits] = useState({});

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (!token) return;
    api.me(token).then((me) => setUser(me)).catch(() => setToken(null));
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    const load = async () => {
      try {
        const [prod, ing, cats, ords] = await Promise.all([
          api.getProducts(token, user.role === 'Admin'),
          api.getIngredients(token),
          api.fetchCategories(token),
          api.listOrders(token),
        ]);
        setProducts(prod);
        setIngredients(ing);
        setCategories(cats);
        setOrders(ords);
        if (user.role === 'Admin') {
          const emps = await api.listEmployees(token);
          setEmployees(emps);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [token, user]);

  useEffect(() => {
    if (!token || user?.role !== 'Admin') return;
    api.salesReport(reportPeriod, token).then(setReport).catch((err) => setError(err.message));
  }, [token, user, reportPeriod]);

  const handleLogin = async () => {
    setError('');
    try {
      const data = await api.login(loginForm.phone, loginForm.password);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.employee);
      setInfo('Успішний вхід');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCart([]);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.product_id === product.product_id);
      if (exists) {
        return prev.map((p) => (p.product_id === product.product_id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQty = (id, qty) => {
    setCart((prev) => prev.map((p) => (p.product_id === id ? { ...p, quantity: Math.max(1, qty) } : p)));
  };

  const placeOrder = async () => {
    setError('');
    try {
      const items = cart.map((c) => ({ productId: c.product_id, quantity: c.quantity }));
      const resp = await api.createOrder(items, payment, token);
      setInfo(resp.message);
      setCart([]);
      const [ing, ords] = await Promise.all([api.getIngredients(token), api.listOrders(token)]);
      setIngredients(ing);
      setOrders(ords);
    } catch (err) {
      setError(err.message);
    }
  };

  const submitEmployee = async () => {
    setError('');
    try {
      await api.createEmployee(newEmployee, token);
      setInfo('Бариста доданий');
      setNewEmployee({ name: '', phone: '', password: '', role: 'Barista' });
      const emps = await api.listEmployees(token);
      setEmployees(emps);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveProduct = async () => {
    setError('');
    try {
      await api.createProduct({
        ...productForm,
        price: Number(productForm.price || 0),
        category_id: Number(productForm.category_id || 0),
      }, token);
      setInfo('Продукт додано');
      setProductForm({ name: '', description: '', price: '', category_id: '' });
      const prod = await api.getProducts(token, isAdmin);
      setProducts(prod);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleProduct = async (product) => {
    await api.updateProduct(product.product_id, { is_active: !product.is_active }, token);
    const prod = await api.getProducts(token, isAdmin);
    setProducts(prod);
  };

  const createNewCategory = async () => {
    if (!categoryName.trim()) return;
    await api.createCategory(categoryName, token);
    setCategoryName('');
    const cats = await api.fetchCategories(token);
    setCategories(cats);
  };

  const saveRecipe = async () => {
    if (!recipeForm.productId) return setError('Оберіть продукт');
    const items = recipeForm.text
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((pair) => {
        const [id, qty] = pair.split(':').map((x) => x.trim());
        return { ingredient_id: Number(id), quantity_required: Number(qty) };
      });
    try {
      await api.setRecipes(recipeForm.productId, items, token);
      setInfo('Рецептура збережена');
    } catch (err) {
      setError(err.message);
    }
  };

  const loadRecipe = async (productId) => {
    if (!productId) return;
    const list = await api.fetchRecipes(productId, token);
    const text = list.map((r) => `${r.ingredient_id}:${r.quantity_required}`).join(', ');
    setRecipeForm((prev) => ({ ...prev, productId, text }));
  };

  const inventory = async (id, actual) => {
    try {
      await api.inventoryIngredient(id, Number(actual), token);
      setIngredients(await api.getIngredients(token));
    } catch (err) {
      setError(err.message);
    }
  };

  const writeoff = async (id, qty) => {
    try {
      await api.writeoffIngredient(id, Number(qty), token);
      setIngredients(await api.getIngredients(token));
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStockRules = async (id, threshold) => {
    await api.updateIngredient(id, { warning_threshold: Number(threshold) }, token);
    setIngredients(await api.getIngredients(token));
  };

  const confirmOrder = async (orderId) => {
    await api.updateOrderStatus(orderId, 'Completed', token);
    setOrders(await api.listOrders(token));
  };

  const setEditValue = (id, key, value) => {
    setInventoryEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const refreshEmployees = async () => {
    if (!isAdmin) return;
    try {
      setEmployees(await api.listEmployees(token));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token || !user) {
    return (
      <>
        <header>
          <div className="logo">Coffee POS</div>
          <nav>
            <button onClick={handleLogin}>Увійти</button>
          </nav>
        </header>
        <div className="container">
          <div className="card" style={{ maxWidth: 420 }}>
            <h3>Вхід</h3>
            <div className="flex">
              <input
                placeholder="Телефон"
                value={loginForm.phone}
                onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })}
              />
              <input
                type="password"
                placeholder="Пароль"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>
            <button onClick={handleLogin}>Увійти</button>
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            <p className="badge">Адмін: +380991234567 / admin123</p>
            <p className="badge">Бариста: +380997654321 / barista123</p>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <header>
        <div className="logo">Coffee POS · {user.role}</div>
        <nav>
          {isAdmin && <button onClick={() => document.getElementById('admin-block')?.scrollIntoView({ behavior: 'smooth' })}>+ Бариста</button>}
          <button className="secondary" onClick={handleLogout}>Вийти</button>
        </nav>
      </header>
      <div className="container">
        <div className="status-bar">
          <span className="badge">Вітаємо, {user.name}</span>
          {info && <span className="badge">{info}</span>}
          {error && <span className="badge low">{error}</span>}
        </div>

        <section>
          <div className="section-title">
            <h3>Меню</h3>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              {paymentOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="card-grid">
              {products.map((p) => (
                <div key={p.product_id} className="card">
                  <h4>{p.name}</h4>
                  <p>{p.description}</p>
                  <strong>{Number(p.price).toFixed(2)} грн</strong>
                  <div style={{ marginTop: 8 }}>
                    {!p.is_active && <span className="badge low">Вимкнено</span>}
                    <button disabled={!p.is_active} onClick={() => addToCart(p)}>Додати</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        <section>
          <div className="section-title">
            <h3>Кошик</h3>
            <button disabled={!cart.length} onClick={placeOrder}>Оплатити</button>
          </div>
          {!cart.length && <p>Додайте позиції до замовлення.</p>}
          {cart.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Назва</th>
                  <th>К-сть</th>
                  <th>Сума</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product_id}>
                    <td>{item.name}</td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        min={1}
                        onChange={(e) => updateCartQty(item.product_id, Number(e.target.value))}
                        style={{ width: 70 }}
                      />
                    </td>
                    <td>{(Number(item.price) * item.quantity).toFixed(2)} грн</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <div className="section-title">
            <h3>Склад</h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Інгредієнт</th>
                <th>Залишок</th>
                <th>Поріг</th>
                {isAdmin && <th>Інвентаризація</th>}
                {isAdmin && <th>Списання / Поріг</th>}
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.ingredient_id}>
                  <td>{ing.name}</td>
                  <td>{Number(ing.current_stock).toFixed(2)} {ing.unit}</td>
                  <td className={ing.low ? 'badge low' : ''}>{Number(ing.warning_threshold).toFixed(2)}</td>
                  {isAdmin && (
                    <td>
                      <div className="flex">
                        <input
                          type="number"
                          placeholder="Факт"
                          value={inventoryEdits[ing.ingredient_id]?.actual || ''}
                          onChange={(e) => setEditValue(ing.ingredient_id, 'actual', e.target.value)}
                        />
                        <button onClick={() => inventory(ing.ingredient_id, inventoryEdits[ing.ingredient_id]?.actual || ing.current_stock)}>Оновити</button>
                      </div>
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      <div className="flex">
                        <input
                          type="number"
                          placeholder="Списати"
                          value={inventoryEdits[ing.ingredient_id]?.writeoff || ''}
                          onChange={(e) => setEditValue(ing.ingredient_id, 'writeoff', e.target.value)}
                        />
                        <button onClick={() => writeoff(ing.ingredient_id, inventoryEdits[ing.ingredient_id]?.writeoff || 0)}>Списати</button>
                      </div>
                      <div className="flex" style={{ marginTop: 4 }}>
                        <input
                          type="number"
                          placeholder="Поріг"
                          value={inventoryEdits[ing.ingredient_id]?.threshold || ''}
                          onChange={(e) => setEditValue(ing.ingredient_id, 'threshold', e.target.value)}
                        />
                        <button onClick={() => updateStockRules(ing.ingredient_id, inventoryEdits[ing.ingredient_id]?.threshold || ing.warning_threshold)}>Зберегти</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <div className="section-title">
            <h3>Замовлення</h3>
          </div>
          {!orders.length && <p>Ще немає замовлень.</p>}
          {orders.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Сума</th>
                  <th>Статус</th>
                  <th>Оплата</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.order_id}>
                    <td>{o.order_id}</td>
                    <td>{Number(o.total_amount).toFixed(2)}</td>
                    <td>{o.status}</td>
                    <td>{o.payment_method}</td>
                    <td>
                      {o.status !== 'Completed' && (
                        <button onClick={() => confirmOrder(o.order_id)}>Підтвердити виконання</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {isAdmin && (
          <section id="admin-block">
            <div className="section-title">
              <h3>Адмін · Облікові записи</h3>
              <button onClick={submitEmployee}>Додати</button>
            </div>
            <div className="flex">
              <input placeholder="Ім'я" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
              <input placeholder="Телефон" value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
              <input placeholder="Пароль" value={newEmployee.password} onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })} />
              <select value={newEmployee.role} onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}>
                <option value="Barista">Barista</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ім'я</th>
                  <th>Телефон</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.employee_id}>
                    <td>{e.employee_id}</td>
                    <td>{e.name}</td>
                    <td>{e.phone}</td>
                    <td>{e.role}</td>
                    <td>{e.is_active ? 'Активний' : 'Видалений'}</td>
                    <td>
                      <button onClick={() => api.updateEmployee(e.employee_id, { is_active: !e.is_active }, token).then(refreshEmployees).catch((err) => setError(err.message))}>{e.is_active ? 'Деактивувати' : 'Відновити'}</button>
                      <button className="secondary" onClick={() => api.deactivateEmployee(e.employee_id, token).then(refreshEmployees).catch((err) => setError(err.message))}>Видалити</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="section-title" style={{ marginTop: 24 }}>
              <h3>Меню та рецептури</h3>
              <button onClick={saveProduct}>Зберегти продукт</button>
            </div>
            <div className="flex">
              <input placeholder="Назва" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              <input placeholder="Опис" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              <input placeholder="Ціна" type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
              <select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
                <option value="">Категорія</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex" style={{ marginTop: 8 }}>
              <input placeholder="Нова категорія" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
              <button onClick={createNewCategory}>Додати категорію</button>
            </div>

            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Назва</th>
                  <th>Категорія</th>
                  <th>Ціна</th>
                  <th>Статус</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.product_id}>
                    <td>{p.product_id}</td>
                    <td>{p.name}</td>
                    <td>{p.Category?.name}</td>
                    <td>{Number(p.price).toFixed(2)}</td>
                    <td>{p.is_active ? 'Активний' : 'Вимкнений'}</td>
                    <td className="flex">
                      <button onClick={() => toggleProduct(p)}>{p.is_active ? 'Вимкнути' : 'Увімкнути'}</button>
                      <button className="secondary" onClick={() => { loadRecipe(p.product_id); document.getElementById('recipe-box')?.scrollIntoView({ behavior: 'smooth' }); }}>Рецепт</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="card" id="recipe-box">
              <h4>Рецептура</h4>
              <select value={recipeForm.productId} onChange={(e) => { const id = e.target.value; setRecipeForm({ ...recipeForm, productId: id }); loadRecipe(id); }}>
                <option value="">Оберіть продукт</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>{p.name}</option>
                ))}
              </select>
              <textarea
                rows={3}
                placeholder="ingredient_id:qty, ... напр. 1:0.02,7:1"
                value={recipeForm.text}
                onChange={(e) => setRecipeForm({ ...recipeForm, text: e.target.value })}
              />
              <button onClick={saveRecipe}>Зберегти рецептуру</button>
            </div>

            <div className="section-title" style={{ marginTop: 24 }}>
              <h4>Звіт продажів</h4>
              <select value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
                <option value="day">День</option>
                <option value="week">Тиждень</option>
                <option value="month">Місяць</option>
              </select>
            </div>
            <p>Сума: {Number(report.total).toFixed(2)} грн</p>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Сума</th>
                  <th>Оплата</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {report.orders?.map((o) => (
                  <tr key={o.order_id}>
                    <td>{o.order_id}</td>
                    <td>{Number(o.total_amount).toFixed(2)}</td>
                    <td>{o.payment_method}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
