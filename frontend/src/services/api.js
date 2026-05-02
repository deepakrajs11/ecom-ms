const API_BASE_URL = '/api';
const AUTH_TOKEN_KEY = 'authToken';

export async function getCurrentUser() {
  return normalizeUser(await apiFetch('/auth/me'));
}

export async function loginUser(credentials) {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  const token = getTokenFromResponse(response);

  if (token) {
    setAuthToken(token);
  }

  if (response?.user) {
    return { ...response, user: normalizeUser(response.user) };
  }

  if (token) {
    return getCurrentUser();
  }

  return normalizeUser(response);
}

export async function registerUser(account) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(account),
  });
}

export async function sendEmailOtp(email) {
  return apiFetch('/auth/validateEmail', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: email,
  });
}

export async function verifyEmailOtp(email, otp) {
  return apiFetch('/auth/verifyOtp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPassword({ email, otp, password }) {
  return apiFetch('/auth/password-reset', {
    method: 'PUT',
    body: JSON.stringify({ email, otp, password }),
  });
}

export async function logoutUser() {
  clearAuthToken();
}

export async function getUsers() {
  return apiFetch('/users');
}

export async function updateUser(userId, user) {
  return apiFetch(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  });
}

export async function updateUserByEmail(user) {
  const response = await apiFetch('/users/updateByEmail', {
    method: 'PUT',
    body: JSON.stringify(user),
  });

  return typeof response === 'object' ? normalizeUser(response) : response;
}

export async function deleteUserById(userId) {
  return apiFetch(`/users/${userId}`, { method: 'DELETE' });
}

export async function getProducts({ page = 0, size = 12, search = '', category = '' } = {}) {
  const params = new URLSearchParams({ page, size });

  if (search.trim()) {
    params.set('name', search.trim());
    return normalizeProductPage(await apiFetch(`/products/search?${params.toString()}`));
  }

  if (category.trim()) {
    return normalizeProductPage(
      await apiFetch(`/products/category/${encodeURIComponent(category.trim())}?${params.toString()}`)
    );
  }

  return normalizeProductPage(await apiFetch(`/products?${params.toString()}`));
}

export async function getProductById(productId) {
  return normalizeProduct(await apiFetch(`/products/${productId}`));
}

export async function createProduct(product) {
  return normalizeProduct(await apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(normalizeProductPayload(product)),
  }));
}

export async function updateProduct(productId, product) {
  return normalizeProduct(await apiFetch(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(normalizeProductPayload(product)),
  }));
}

export async function deleteProductById(productId) {
  return apiFetch(`/products/${productId}`, { method: 'DELETE' });
}

export async function getCart() {
  return normalizeCart(await apiFetch('/cart'));
}

export async function addCartItem(productId, quantity = 1) {
  return normalizeCart(await apiFetch('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  }));
}

export async function updateCartItem(productId, quantity) {
  return normalizeCart(await apiFetch(`/cart/items/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  }));
}

export async function removeCartItem(productId) {
  return normalizeCart(await apiFetch(`/cart/items/${productId}`, { method: 'DELETE' }));
}

export async function clearCart() {
  return apiFetch('/cart', { method: 'DELETE' });
}

export async function createOrder(order) {
  return normalizeOrder(await apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  }));
}

export async function getMyOrders() {
  const response = await apiFetch('/orders');

  return Array.isArray(response) ? response.map(normalizeOrder) : [];
}

export async function cancelOrder(orderId) {
  return normalizeOrder(await apiFetch(`/orders/${orderId}/cancel`, { method: 'POST' }));
}

export async function getAdminOrders() {
  const response = await apiFetch('/orders/admin');

  return Array.isArray(response) ? response.map(normalizeOrder) : [];
}

export async function updateAdminOrderStatus(orderId, status) {
  return normalizeOrder(await apiFetch(`/orders/admin/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }));
}

export async function updateAdminPaymentStatus({ orderNumber, paymentStatus, paymentReference }) {
  return normalizeOrder(await apiFetch('/orders/admin/payment-status', {
    method: 'PUT',
    body: JSON.stringify({ orderNumber, paymentStatus, paymentReference }),
  }));
}

async function apiFetch(path, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is unavailable in this environment.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || data?.detail || data?.error || data || 'Request failed.');
  }

  return data;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

function getAuthHeaders() {
  const token = getAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function getTokenFromResponse(response) {
  return response?.token || response?.accessToken || response?.jwt;
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    id: user.id || user.userId || user.userID || user._id || user.uuid,
    name: user.name || user.fullName || user.username || user.email,
    role: normalizeRole(user.role || user.roles?.[0] || user.authorities?.[0]),
  };
}

function normalizeProductPage(response) {
  if (Array.isArray(response)) {
    return {
      content: response.map(normalizeProduct),
      number: 0,
      totalPages: 1,
      totalElements: response.length,
    };
  }

  return {
    ...response,
    content: Array.isArray(response?.content) ? response.content.map(normalizeProduct) : [],
    number: response?.number || 0,
    totalPages: response?.totalPages || 1,
    totalElements: response?.totalElements || response?.content?.length || 0,
  };
}

function normalizeProduct(product) {
  if (!product) {
    return null;
  }

  return {
    ...product,
    id: product.id || product.productId || product._id,
    name: product.name || '',
    description: product.description || '',
    sku: product.sku || '',
    price: Number(product.price || 0),
    quantity: Number(product.quantity || 0),
    category: product.category || '',
    imageUrl: product.imageUrl || '',
    active: product.active !== false,
  };
}

function normalizeProductPayload(product) {
  return {
    name: product.name.trim(),
    description: product.description.trim(),
    sku: product.sku.trim(),
    price: Number(product.price),
    quantity: Number(product.quantity),
    category: product.category.trim(),
    imageUrl: product.imageUrl.trim(),
    active: product.active !== false,
  };
}

function normalizeCart(cart) {
  if (!cart) {
    return {
      userId: null,
      userEmail: '',
      items: [],
      totalQuantity: 0,
      totalAmount: 0,
    };
  }

  const items = Array.isArray(cart.items) ? cart.items.map(normalizeCartItem) : [];

  return {
    ...cart,
    items,
    totalQuantity: Number(cart.totalQuantity || items.reduce((total, item) => total + item.quantity, 0)),
    totalAmount: Number(cart.totalAmount || items.reduce((total, item) => total + item.lineTotal, 0)),
  };
}

function normalizeCartItem(item) {
  return {
    ...item,
    id: item.id || item.cartItemId,
    productId: item.productId,
    productName: item.productName || item.name || '',
    sku: item.sku || '',
    imageUrl: item.imageUrl || '',
    unitPrice: Number(item.unitPrice || item.price || 0),
    quantity: Number(item.quantity || 0),
    lineTotal: Number(item.lineTotal || 0),
  };
}

function normalizeOrder(order) {
  if (!order) {
    return null;
  }

  const items = Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [];

  return {
    ...order,
    id: order.id || order.orderId,
    orderNumber: order.orderNumber || '',
    userId: order.userId,
    userEmail: order.userEmail || '',
    status: order.status || '',
    paymentStatus: order.paymentStatus || '',
    totalQuantity: Number(order.totalQuantity || items.reduce((total, item) => total + item.quantity, 0)),
    totalAmount: Number(order.totalAmount || items.reduce((total, item) => total + item.lineTotal, 0)),
    shippingAddress: order.shippingAddress || '',
    contactPhone: order.contactPhone || '',
    paymentReference: order.paymentReference || '',
    createdAt: order.createdAt || '',
    updatedAt: order.updatedAt || '',
    items,
  };
}

function normalizeOrderItem(item) {
  return {
    ...item,
    id: item.id || item.orderItemId,
    productId: item.productId,
    productName: item.productName || '',
    sku: item.sku || '',
    imageUrl: item.imageUrl || '',
    unitPrice: Number(item.unitPrice || 0),
    quantity: Number(item.quantity || 0),
    lineTotal: Number(item.lineTotal || 0),
  };
}

function normalizeRole(role) {
  const value = typeof role === 'object' ? role.authority : role;

  if (!value) {
    return undefined;
  }

  return String(value).replace(/^ROLE_/, '').toUpperCase();
}
