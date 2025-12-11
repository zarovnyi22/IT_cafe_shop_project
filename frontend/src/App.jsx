import { useEffect, useState } from 'react';
import * as api from './api';

const paymentOptions = ['Card', 'Cash', 'App'];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [cart, setCart] = useState([]);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [payment, setPayment] = useState('Card');
  const [newEmployee, setNewEmployee] = useState({ name: '', phone: '', password: '', role: 'Barista' });
  const [report, setReport] = useState({ total: 0, orders: [] });
  const [reportPeriod, setReportPeriod] = useState('day');

  useEffect(() => {
    if (!token) return;
    api.me(token).then((me) => setUser(me)).catch(() => setToken(null));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.getProducts(token), api.getIngredients(token)])
      .then(([prod, ing]) => {
        setProducts(prod);
        setIngredients(ing);
      })
      .catch((err) => setError(err.message));
  }, [token]);

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
      const ing = await api.getIngredients(token);
      setIngredients(ing);
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

  const isAdmin = user.role === 'Admin';

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
                  <button onClick={() => addToCart(p)}>Додати</button>
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
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.ingredient_id}>
                  <td>{ing.name}</td>
                  <td>{Number(ing.current_stock).toFixed(2)} {ing.unit}</td>
                  <td className={ing.low ? 'badge low' : ''}>{Number(ing.warning_threshold).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {isAdmin && (
          <section id="admin-block">
            <div className="section-title">
              <h3>Адмін · Баристи</h3>
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

            <div className="section-title">
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
