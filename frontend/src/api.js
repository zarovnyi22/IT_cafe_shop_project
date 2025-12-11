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

export function getProducts(token, includeInactive = false) {
  const query = includeInactive ? '?all=true' : '';
  return request(`/products${query}`, {}, token);
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

export function listEmployees(token) {
  return request('/employees', {}, token);
}

export function updateEmployee(id, data, token) {
  return request(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token);
}

export function deactivateEmployee(id, token) {
  return request(`/employees/${id}`, { method: 'DELETE' }, token);
}

export function createProduct(data, token) {
  return request('/products', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function updateProduct(id, data, token) {
  return request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export function fetchCategories(token) {
  return request('/categories', {}, token);
}

export function createCategory(name, token) {
  return request('/categories', { method: 'POST', body: JSON.stringify({ name }) }, token);
}

export function inventoryIngredient(id, actual, token) {
  return request(`/ingredients/${id}/inventory`, { method: 'POST', body: JSON.stringify({ actual }) }, token);
}

export function writeoffIngredient(id, quantity, token) {
  return request(`/ingredients/${id}/writeoff`, { method: 'POST', body: JSON.stringify({ quantity }) }, token);
}

export function updateIngredient(id, data, token) {
  return request(`/ingredients/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export function setRecipes(productId, items, token) {
  return request(`/products/${productId}/recipes`, { method: 'PUT', body: JSON.stringify({ items }) }, token);
}

export function fetchRecipes(productId, token) {
  return request(`/products/${productId}/recipes`, {}, token);
}

export function listOrders(token) {
  return request('/orders', {}, token);
}

export function updateOrderStatus(orderId, status, token) {
  return request(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
}

export function salesReport(period, token) {
  const query = period ? `?period=${period}` : '';
  return request(`/reports/sales${query}`, {}, token);
}

export default {
  login,
  me,
  getProducts,
  getIngredients,
  createOrder,
  createEmployee,
  listEmployees,
  updateEmployee,
  deactivateEmployee,
  createProduct,
  updateProduct,
  fetchCategories,
  createCategory,
  inventoryIngredient,
  writeoffIngredient,
  updateIngredient,
  setRecipes,
  fetchRecipes,
  listOrders,
  updateOrderStatus,
  salesReport,
};
