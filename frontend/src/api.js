const API = '/api';

async function request(path, options = {}, token) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Помилка запиту');
  }
  return res.json();
}

export function login(phone, password) {
  return request('/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
}

export function me(token) {
  return request('/me', {}, token);
}

export function getProducts(token) {
  return request('/products', {}, token);
}

export function getIngredients(token) {
  return request('/ingredients', {}, token);
}

export function createOrder(items, payment_method, token) {
  return request('/orders', { method: 'POST', body: JSON.stringify({ items, payment_method }) }, token);
}

export function createEmployee(data, token) {
  return request('/employees', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function salesReport(period, token) {
  const query = period ? `?period=${period}` : '';
  return request(`/reports/sales${query}`, {}, token);
}

export default { login, me, getProducts, getIngredients, createOrder, createEmployee, salesReport };
