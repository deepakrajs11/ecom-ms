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
    throw new Error(data?.message || 'Request failed.');
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

function normalizeRole(role) {
  const value = typeof role === 'object' ? role.authority : role;

  if (!value) {
    return undefined;
  }

  return String(value).replace(/^ROLE_/, '').toUpperCase();
}
