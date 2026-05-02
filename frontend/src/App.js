import { useEffect, useState } from 'react';
import './App.css';
import {
  addCartItem,
  clearCart,
  createProduct,
  deleteProductById,
  deleteUserById,
  getCart,
  getCurrentUser,
  getProductById,
  getProducts,
  getUsers,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  sendEmailOtp,
  removeCartItem,
  updateProduct,
  updateCartItem,
  updateUser,
  updateUserByEmail,
  verifyEmailOtp,
} from './services/api';

const initialUsers = [
  { id: 1, name: 'Aarav Sharma', email: 'aarav@example.com', role: 'USER' },
  { id: 2, name: 'Meera Iyer', email: 'meera@example.com', role: 'USER' },
  { id: 3, name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PASSWORD_REQUIREMENTS = 'Use at least 8 characters with uppercase, lowercase, number, and special character.';

const emptyRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const emptyForgotPasswordForm = {
  email: '',
  password: '',
  confirmPassword: '',
};

const emptyProductForm = {
  name: '',
  description: '',
  sku: '',
  price: '',
  quantity: '',
  category: '',
  imageUrl: '',
  active: true,
};

const pathToPage = {
  '/': 'home',
  '/login': 'login',
  '/register': 'register',
  '/forgot-password': 'forgotPassword',
  '/products': 'products',
  '/cart': 'cart',
  '/admin/products': 'adminProducts',
  '/users': 'users',
  '/profile': 'profile',
};

const pageToPath = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  products: '/products',
  cart: '/cart',
  adminProducts: '/admin/products',
  users: '/users',
  profile: '/profile',
};

function App() {
  const [activePage, setActivePage] = useState(() => pathToPage[window.location.pathname] || 'home');
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [forgotPasswordForm, setForgotPasswordForm] = useState(emptyForgotPasswordForm);
  const [emailVerification, setEmailVerification] = useState({
    otp: '',
    sentTo: '',
    status: 'idle',
  });
  const [passwordResetVerification, setPasswordResetVerification] = useState({
    otp: '',
    sentTo: '',
    status: 'idle',
  });
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [users, setUsers] = useState(initialUsers);
  const [editingUserId, setEditingUserId] = useState(null);
  const [draftUser, setDraftUser] = useState({ name: '', email: '' });
  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState({ number: 0, totalPages: 1, totalElements: 0 });
  const [productFilters, setProductFilters] = useState({ search: '', category: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [cart, setCart] = useState({ items: [], totalQuantity: 0, totalAmount: 0 });
  const [cartBusyProductId, setCartBusyProductId] = useState(null);
  const [notice, setNotice] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    function syncPath() {
      setActivePage(pathToPage[window.location.pathname] || 'home');
    }

    window.addEventListener('popstate', syncPath);

    return () => {
      window.removeEventListener('popstate', syncPath);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const user = await getCurrentUser();

        if (!ignore) {
          setCurrentUser(user);
        }
      } catch {
        if (!ignore) {
          setCurrentUser(null);
        }
      } finally {
        if (!ignore) {
          setAuthChecked(true);
        }
      }
    }

    loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let ignore = false;

    async function loadUsers() {
      try {
        const adminUsers = await getUsers();

        if (!ignore && Array.isArray(adminUsers)) {
          setUsers(adminUsers);
        }
      } catch {
        setNotice('Admin API is not reachable yet, so the local sample users are shown.');
      }
    }

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!['home', 'products', 'adminProducts'].includes(activePage)) {
      return;
    }

    let ignore = false;

    async function loadProducts() {
      try {
        const page = await getProducts({
          page: productPage.number,
          search: productFilters.search,
          category: productFilters.category,
        });

        if (!ignore) {
          setProducts(page.content);
          setProductPage({
            number: page.number,
            totalPages: page.totalPages,
            totalElements: page.totalElements,
          });
        }
      } catch {
        if (!ignore) {
          setNotice('Product API is not reachable yet.');
        }
      }
    }

    loadProducts();

    return () => {
      ignore = true;
    };
  }, [activePage, productFilters, productPage.number]);

  useEffect(() => {
    if (!currentUser) {
      setCart({ items: [], totalQuantity: 0, totalAmount: 0 });
      return;
    }

    let ignore = false;

    async function loadCart() {
      try {
        const userCart = await getCart();

        if (!ignore) {
          setCart(userCart);
        }
      } catch (error) {
        if (!ignore && activePage === 'cart') {
          setNotice(error.message || 'Cart API request failed. Check cart service logs for the downstream error.');
        }
      }
    }

    loadCart();

    return () => {
      ignore = true;
    };
  }, [currentUser, activePage]);

  async function handleLogin(event) {
    event.preventDefault();

    if (!isValidEmail(loginForm.email)) {
      setNotice('Enter a valid email address.');
      return;
    }

    if (!isStrongPassword(loginForm.password)) {
      setNotice(PASSWORD_REQUIREMENTS);
      return;
    }

    try {
      const response = await loginUser(loginForm);
      const user = response?.user || response || await getCurrentUser();

      setCurrentUser(user);
      setNotice('Signed in. Role came from the server-side /me check.');
      navigate('home');
    } catch (error) {
      setNotice(error.message || 'Login failed.');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    if (!isValidEmail(registerForm.email)) {
      setNotice('Enter a valid email address.');
      return;
    }

    if (!isStrongPassword(registerForm.password)) {
      setNotice(PASSWORD_REQUIREMENTS);
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setNotice('Password and confirm password must match.');
      return;
    }

    if (emailVerification.status !== 'verified' || emailVerification.sentTo !== registerForm.email) {
      setNotice('Verify your email with OTP before creating the account.');
      return;
    }

    try {
      await registerUser({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
      });

      setRegisterForm(emptyRegisterForm);
      setEmailVerification({ otp: '', sentTo: '', status: 'idle' });
      setNotice('Account created. The backend owns the default USER role.');
      navigate('login');
    } catch (error) {
      setNotice(error.message || 'Registration failed.');
    }
  }

  async function requestEmailOtp() {
    if (!isValidEmail(registerForm.email)) {
      setNotice('Enter a valid email address before requesting OTP.');
      return;
    }

    setEmailVerification({ otp: '', sentTo: registerForm.email, status: 'sending' });

    try {
      await sendEmailOtp(registerForm.email);
      setEmailVerification({ otp: '', sentTo: registerForm.email, status: 'sent' });
      setNotice('OTP sent to your email. It expires in 10 minutes.');
    } catch (error) {
      setEmailVerification({ otp: '', sentTo: '', status: 'idle' });
      setNotice(error.message || 'Could not send OTP.');
    }
  }

  async function verifyRegisterOtp() {
    if (!emailVerification.otp.trim()) {
      setNotice('Enter the OTP sent to your email.');
      return;
    }

    setEmailVerification((current) => ({ ...current, status: 'verifying' }));

    try {
      await verifyEmailOtp(registerForm.email, emailVerification.otp.trim());
      setEmailVerification((current) => ({ ...current, sentTo: registerForm.email, status: 'verified' }));
      setNotice('Email verified.');
    } catch (error) {
      setEmailVerification((current) => ({ ...current, status: 'sent' }));
      setNotice(error.message || 'Invalid or expired OTP.');
    }
  }

  function updateRegisterForm(nextForm) {
    setRegisterForm(nextForm);

    if (nextForm.email !== registerForm.email) {
      setEmailVerification({ otp: '', sentTo: '', status: 'idle' });
    }
  }

  async function requestPasswordResetOtp() {
    if (!isValidEmail(forgotPasswordForm.email)) {
      setNotice('Enter a valid email address before requesting OTP.');
      return;
    }

    setPasswordResetVerification({ otp: '', sentTo: forgotPasswordForm.email, status: 'sending' });

    try {
      await sendEmailOtp(forgotPasswordForm.email);
      setPasswordResetVerification({ otp: '', sentTo: forgotPasswordForm.email, status: 'sent' });
      setNotice('OTP sent to your email. It expires in 10 minutes.');
    } catch (error) {
      setPasswordResetVerification({ otp: '', sentTo: '', status: 'idle' });
      setNotice(error.message || 'Could not send OTP.');
    }
  }

  function updateForgotPasswordForm(nextForm) {
    setForgotPasswordForm(nextForm);

    if (nextForm.email !== forgotPasswordForm.email) {
      setPasswordResetVerification({ otp: '', sentTo: '', status: 'idle' });
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();

    if (!isValidEmail(forgotPasswordForm.email)) {
      setNotice('Enter a valid email address.');
      return;
    }

    if (passwordResetVerification.status !== 'sent' || passwordResetVerification.sentTo !== forgotPasswordForm.email) {
      setNotice('Request OTP before resetting the password.');
      return;
    }

    if (!passwordResetVerification.otp.trim()) {
      setNotice('Enter the OTP sent to your email.');
      return;
    }

    if (!isStrongPassword(forgotPasswordForm.password)) {
      setNotice(PASSWORD_REQUIREMENTS);
      return;
    }

    if (forgotPasswordForm.password !== forgotPasswordForm.confirmPassword) {
      setNotice('Password and confirm password must match.');
      return;
    }

    try {
      await resetPassword({
        email: forgotPasswordForm.email,
        otp: passwordResetVerification.otp.trim(),
        password: forgotPasswordForm.password,
      });
      setForgotPasswordForm(emptyForgotPasswordForm);
      setPasswordResetVerification({ otp: '', sentTo: '', status: 'idle' });
      setNotice('Password updated. You can login with the new password.');
      navigate('login');
    } catch (error) {
      setNotice(error.message || 'Could not update password.');
    }
  }

  async function handleLogout() {
    await logoutUser().catch(() => null);
    setCurrentUser(null);
    setCart({ items: [], totalQuantity: 0, totalAmount: 0 });
    setNotice('Signed out.');
    navigate('home');
  }

  function updateProductFilters(nextFilters) {
    setProductFilters(nextFilters);
    setProductPage((current) => ({ ...current, number: 0 }));
  }

  async function viewProduct(productId) {
    try {
      const product = await getProductById(productId);
      setSelectedProduct(product);
    } catch (error) {
      setNotice(error.message || 'Could not load product details.');
    }
  }

  function startProductCreate() {
    setEditingProductId('new');
    setProductForm(emptyProductForm);
  }

  function startProductEdit(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      sku: product.sku || '',
      price: product.price ?? '',
      quantity: product.quantity ?? '',
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      active: product.active !== false,
    });
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!productForm.name.trim() || !productForm.sku.trim()) {
      setNotice('Product name and SKU are required.');
      return;
    }

    if (Number(productForm.price) < 0 || Number(productForm.quantity) < 0) {
      setNotice('Price and quantity cannot be negative.');
      return;
    }

    try {
      const savedProduct = editingProductId === 'new'
        ? await createProduct(productForm)
        : await updateProduct(editingProductId, productForm);

      setProducts((currentProducts) => {
        if (editingProductId === 'new') {
          return [savedProduct, ...currentProducts];
        }

        return currentProducts.map((product) => product.id === savedProduct.id ? savedProduct : product);
      });
      setEditingProductId(null);
      setProductForm(emptyProductForm);
      setNotice(editingProductId === 'new' ? 'Product created.' : 'Product updated.');
    } catch (error) {
      setNotice(error.message || 'Could not save product.');
    }
  }

  async function deleteProduct(productId) {
    try {
      await deleteProductById(productId);
      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
      setNotice('Product deleted.');
    } catch (error) {
      setNotice(error.message || 'Could not delete product.');
    }
  }

  async function addProductToCart(productId, quantity = 1) {
    if (!currentUser) {
      setNotice('Login before adding products to your cart.');
      navigate('login');
      return;
    }

    setCartBusyProductId(productId);

    try {
      const nextCart = await addCartItem(productId, quantity);
      setCart(nextCart);
      setNotice('Product added to cart.');
    } catch (error) {
      setNotice(error.message || 'Could not add product to cart.');
    } finally {
      setCartBusyProductId(null);
    }
  }

  async function updateCartQuantity(productId, quantity) {
    if (!Number.isFinite(quantity) || quantity < 1) {
      return;
    }

    setCartBusyProductId(productId);

    try {
      const nextCart = await updateCartItem(productId, quantity);
      setCart(nextCart);
    } catch (error) {
      setNotice(error.message || 'Could not update cart item.');
    } finally {
      setCartBusyProductId(null);
    }
  }

  async function removeProductFromCart(productId) {
    setCartBusyProductId(productId);

    try {
      const nextCart = await removeCartItem(productId);
      setCart(nextCart);
      setNotice('Product removed from cart.');
    } catch (error) {
      setNotice(error.message || 'Could not remove cart item.');
    } finally {
      setCartBusyProductId(null);
    }
  }

  async function clearCurrentCart() {
    try {
      await clearCart();
      setCart({ items: [], totalQuantity: 0, totalAmount: 0 });
      setNotice('Cart cleared.');
    } catch (error) {
      setNotice(error.message || 'Could not clear cart.');
    }
  }

  function navigate(page) {
    const path = pageToPath[page] || '/';

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }

    setActivePage(page);
  }

  function startEdit(user) {
    setEditingUserId(user.id);
    setDraftUser({ name: user.name, email: user.email, role: user.role });
  }

  async function saveUser(userId) {
    if (!isValidEmail(draftUser.email)) {
      setNotice('Enter a valid email address before saving.');
      return;
    }

    try {
      await updateUser(userId, draftUser);
    } catch {
      setNotice('Admin update API is not reachable yet, so the local row was updated only.');
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === userId ? { ...user, ...draftUser } : user))
    );
    setEditingUserId(null);
  }

  async function deleteUser(userId) {
    try {
      await deleteUserById(userId);
    } catch {
      setNotice('Admin delete API is not reachable yet, so the local row was deleted only.');
    }

    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
  }

  async function saveProfile(event) {
    event.preventDefault();
    const updatePayload = {
      ...profileForm,
      email: currentUser.email,
    };

    if (!isValidEmail(updatePayload.email)) {
      setNotice('Enter a valid email address before saving.');
      return;
    }

    try {
      const updatedUser = await updateUserByEmail(updatePayload);
      setCurrentUser(updatedUser || { ...currentUser, ...updatePayload });
      setNotice('Profile updated.');
    } catch {
      setCurrentUser((user) => ({ ...user, ...updatePayload }));
      setNotice('Profile update API is not reachable yet, so the local profile was updated only.');
    }
  }

  return (
    <div className="app-shell">
      <Navbar
        activePage={activePage}
        authChecked={authChecked}
        currentUser={currentUser}
        isAdmin={isAdmin}
        cartCount={cart.totalQuantity}
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice">
            x
          </button>
        </div>
      )}

      <main>
        {activePage === 'home' && <Home currentUser={currentUser} isAdmin={isAdmin} onNavigate={navigate} />}
        {activePage === 'products' && (
          <ProductCatalog
            filters={productFilters}
            onFiltersChange={updateProductFilters}
            onPageChange={(number) => setProductPage((current) => ({ ...current, number }))}
            onView={viewProduct}
            onAddToCart={addProductToCart}
            page={productPage}
            products={products}
            selectedProduct={selectedProduct}
            onCloseDetails={() => setSelectedProduct(null)}
            cartBusyProductId={cartBusyProductId}
            currentUser={currentUser}
          />
        )}
        {activePage === 'cart' && (
          <CartPage
            busyProductId={cartBusyProductId}
            cart={cart}
            currentUser={currentUser}
            onClear={clearCurrentCart}
            onNavigate={navigate}
            onRemove={removeProductFromCart}
            onUpdateQuantity={updateCartQuantity}
          />
        )}
        {activePage === 'adminProducts' && (
          <ProductManagement
            editingProductId={editingProductId}
            form={productForm}
            isAdmin={isAdmin}
            onCancel={() => {
              setEditingProductId(null);
              setProductForm(emptyProductForm);
            }}
            onChange={setProductForm}
            onCreate={startProductCreate}
            onDelete={deleteProduct}
            onNavigate={navigate}
            onSave={saveProduct}
            onStartEdit={startProductEdit}
            products={products}
          />
        )}
        {activePage === 'login' && (
          <Login form={loginForm} onChange={setLoginForm} onNavigate={navigate} onSubmit={handleLogin} />
        )}
        {activePage === 'register' && (
          <Register
            emailVerification={emailVerification}
            form={registerForm}
            onChange={updateRegisterForm}
            onOtpChange={(otp) => setEmailVerification((current) => ({ ...current, otp }))}
            onRequestOtp={requestEmailOtp}
            onSubmit={handleRegister}
            onVerifyOtp={verifyRegisterOtp}
          />
        )}
        {activePage === 'forgotPassword' && (
          <ForgotPassword
            form={forgotPasswordForm}
            onChange={updateForgotPasswordForm}
            onNavigate={navigate}
            onOtpChange={(otp) => setPasswordResetVerification((current) => ({ ...current, otp }))}
            onRequestOtp={requestPasswordResetOtp}
            onSubmit={handleForgotPassword}
            verification={passwordResetVerification}
          />
        )}
        {activePage === 'users' && (
          <UserManagement
            draftUser={draftUser}
            editingUserId={editingUserId}
            isAdmin={isAdmin}
            onDelete={deleteUser}
            onDraftChange={setDraftUser}
            onNavigate={navigate}
            onSave={saveUser}
            onStartEdit={startEdit}
            onStopEdit={() => setEditingUserId(null)}
            users={users}
          />
        )}
        {activePage === 'profile' && (
          <Profile
            currentUser={currentUser}
            form={profileForm}
            onChange={setProfileForm}
            onNavigate={navigate}
            onSubmit={saveProfile}
          />
        )}
      </main>
    </div>
  );
}

function Navbar({ activePage, authChecked, cartCount, currentUser, isAdmin, onNavigate, onLogout }) {
  return (
    <header className="navbar">
      <button className="brand" type="button" onClick={() => onNavigate('home')}>
        Star Shop
      </button>

      <nav aria-label="Primary navigation">
        <button className={activePage === 'home' ? 'active' : ''} type="button" onClick={() => onNavigate('home')}>
          Home
        </button>
        <button className={activePage === 'products' ? 'active' : ''} type="button" onClick={() => onNavigate('products')}>
          Products
        </button>
        {currentUser && (
          <button className={activePage === 'cart' ? 'active' : ''} type="button" onClick={() => onNavigate('cart')}>
            Cart {cartCount ? `(${cartCount})` : ''}
          </button>
        )}
        {isAdmin && (
          <>
            <button className={activePage === 'adminProducts' ? 'active' : ''} type="button" onClick={() => onNavigate('adminProducts')}>
              Manage Products
            </button>
            <button className={activePage === 'users' ? 'active' : ''} type="button" onClick={() => onNavigate('users')}>
              Users
            </button>
          </>
        )}
      </nav>

      <div className="auth-actions">
        {!authChecked ? (
          <span className="signed-in">Checking auth...</span>
        ) : currentUser ? (
          <>
            <button className="profile-button" type="button" onClick={() => onNavigate('profile')}>
              <span>{currentUser.name || currentUser.email}</span>
              <span>{currentUser.role}</span>
            </button>
            <button type="button" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onNavigate('login')}>Login</button>
            <button className="primary" type="button" onClick={() => onNavigate('register')}>Register</button>
          </>
        )}
      </div>
    </header>
  );
}

function Profile({ currentUser, form, onChange, onNavigate, onSubmit }) {
  if (!currentUser) {
    return (
      <section className="locked-page">
        <h1>Login required</h1>
        <p>Sign in to view and update your account details.</p>
        <button className="primary" type="button" onClick={() => onNavigate('login')}>Login</button>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile details</h1>
        </div>
        <span className="role-pill">{currentUser.role}</span>
      </div>

      <form className="profile-form" noValidate onSubmit={onSubmit}>
        <div className="profile-summary">
          <div className="avatar" aria-hidden="true">
            {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{currentUser.name || 'Your account'}</h2>
            <p>{currentUser.email}</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Your full name"
            />
          </label>
          <label>
            Email
            <input
              readOnly
              type="email"
              value={currentUser.email || ''}
            />
          </label>
          <label>
            Role
            <input readOnly value={currentUser.role || ''} />
          </label>
        </div>

        <p className="form-hint">
          Password is managed in a separate change-password flow and is never displayed here.
        </p>

        <div className="form-actions">
          <button className="primary" type="submit">Save profile</button>
          <button type="button" onClick={() => onNavigate('home')}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function Home({ currentUser, isAdmin, onNavigate }) {
  return (
    <section className="home-page">
      <div>
        <p className="eyebrow">Ecommerce starter</p>
        <h1>Build the storefront while your Spring Boot services grow.</h1>
        <p className="lead">
          This shell gives you a place to validate backend login, role-based navigation, registration,
          and admin user operations before the entire backend is finished.
        </p>
        <div className="hero-actions">
          <button className="primary" type="button" onClick={() => onNavigate('products')}>
            Browse products
          </button>
          <button type="button" onClick={() => onNavigate(currentUser ? (isAdmin ? 'adminProducts' : 'profile') : 'login')}>
            {currentUser ? (isAdmin ? 'Manage catalog' : 'Open account') : 'Start with login'}
          </button>
        </div>
      </div>

      <div className="status-panel" aria-label="Architecture checklist">
        <h2>Frontend boundaries</h2>
        <ul>
          <li>Register always sends role USER.</li>
          <li>Login stores the access token returned by the backend.</li>
          <li>Protected requests send Authorization: Bearer token.</li>
          <li>Product browsing stays public while catalog changes stay admin-only.</li>
          <li>The current role comes from the server-side /me endpoint.</li>
          <li>Spring Security remains the real authorization layer.</li>
        </ul>
      </div>
    </section>
  );
}

function Login({ form, onChange, onNavigate, onSubmit }) {
  return (
    <section className="auth-page">
      <form className="auth-form" onSubmit={onSubmit}>
        <h1>Login</h1>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
            pattern={EMAIL_PATTERN.source}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            required
            minLength="8"
            pattern={PASSWORD_PATTERN.source}
            title={PASSWORD_REQUIREMENTS}
            type="password"
            value={form.password}
            onChange={(event) => onChange({ ...form, password: event.target.value })}
            placeholder="Your password"
          />
        </label>
        <button className="primary" type="submit">Login</button>
        <button className="link-button" type="button" onClick={() => onNavigate('forgotPassword')}>
          Forgot password?
        </button>
        <p className="form-hint">Login calls the backend, stores the returned token, then asks /me for the user role.</p>
      </form>
    </section>
  );
}

function ForgotPassword({
  form,
  onChange,
  onNavigate,
  onOtpChange,
  onRequestOtp,
  onSubmit,
  verification,
}) {
  const otpSent = verification.status === 'sent' && verification.sentTo === form.email;

  return (
    <section className="auth-page">
      <form className="auth-form register-form" onSubmit={onSubmit}>
        <h1>Reset password</h1>
        <label>
          Email
          <div className="inline-control">
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              pattern={EMAIL_PATTERN.source}
              placeholder="you@example.com"
            />
            <button
              disabled={verification.status === 'sending'}
              type="button"
              onClick={onRequestOtp}
            >
              {verification.status === 'sending' ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
            </button>
          </div>
        </label>

        {otpSent && (
          <div className="otp-panel">
            <div>
              <strong>Enter OTP</strong>
              <p>We sent a 6 digit OTP to {verification.sentTo}. Submit it with your new password.</p>
            </div>
            <input
              inputMode="numeric"
              maxLength="6"
              pattern="[0-9]{6}"
              placeholder="6 digit OTP"
              value={verification.otp}
              onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
        )}

        <label>
          New password
          <input
            required
            minLength="8"
            pattern={PASSWORD_PATTERN.source}
            title={PASSWORD_REQUIREMENTS}
            type="password"
            value={form.password}
            onChange={(event) => onChange({ ...form, password: event.target.value })}
            placeholder="Min 8 with Aa, 1, and #"
          />
        </label>
        <label>
          Confirm new password
          <input
            required
            minLength="8"
            pattern={PASSWORD_PATTERN.source}
            title={PASSWORD_REQUIREMENTS}
            type="password"
            value={form.confirmPassword}
            onChange={(event) => onChange({ ...form, confirmPassword: event.target.value })}
            placeholder="Repeat password"
          />
        </label>
        <p className="form-hint">{PASSWORD_REQUIREMENTS}</p>
        <button className="primary" disabled={!otpSent} type="submit">Update password</button>
        <button className="link-button" type="button" onClick={() => onNavigate('login')}>
          Back to login
        </button>
      </form>
    </section>
  );
}

function Register({
  emailVerification,
  form,
  onChange,
  onOtpChange,
  onRequestOtp,
  onSubmit,
  onVerifyOtp,
}) {
  const otpSent = ['sent', 'verifying', 'verified'].includes(emailVerification.status);
  const emailVerified = emailVerification.status === 'verified' && emailVerification.sentTo === form.email;

  return (
    <section className="auth-page">
      <form className="auth-form register-form" onSubmit={onSubmit}>
        <h1>Register</h1>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="Your full name"
          />
        </label>
        <label>
          Email
          <div className="inline-control">
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              pattern={EMAIL_PATTERN.source}
              placeholder="you@example.com"
            />
            <button
              disabled={emailVerification.status === 'sending' || emailVerified}
              type="button"
              onClick={onRequestOtp}
            >
              {emailVerification.status === 'sending' ? 'Sending...' : emailVerified ? 'Verified' : 'Validate email'}
            </button>
          </div>
        </label>

        {otpSent && (
          <div className={`otp-panel ${emailVerified ? 'verified' : ''}`}>
            <div>
              <strong>{emailVerified ? 'Email verified' : 'Enter OTP'}</strong>
              <p>
                {emailVerified
                  ? 'You can continue creating the account.'
                  : `We sent a 6 digit OTP to ${emailVerification.sentTo}.`}
              </p>
            </div>
            {!emailVerified && (
              <div className="inline-control">
                <input
                  inputMode="numeric"
                  maxLength="6"
                  pattern="[0-9]{6}"
                  placeholder="6 digit OTP"
                  value={emailVerification.otp}
                  onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button
                  className="primary"
                  disabled={emailVerification.status === 'verifying'}
                  type="button"
                  onClick={onVerifyOtp}
                >
                  {emailVerification.status === 'verifying' ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            )}
          </div>
        )}

        <label>
          Password
          <input
            required
            minLength="8"
            pattern={PASSWORD_PATTERN.source}
            title={PASSWORD_REQUIREMENTS}
            type="password"
            value={form.password}
            onChange={(event) => onChange({ ...form, password: event.target.value })}
            placeholder="Min 8 with Aa, 1, and #"
          />
        </label>
        <label>
          Confirm password
          <input
            required
            minLength="8"
            pattern={PASSWORD_PATTERN.source}
            title={PASSWORD_REQUIREMENTS}
            type="password"
            value={form.confirmPassword}
            onChange={(event) => onChange({ ...form, confirmPassword: event.target.value })}
            placeholder="Repeat password"
          />
        </label>
        <p className="form-hint">{PASSWORD_REQUIREMENTS}</p>
        <button className="primary" disabled={!emailVerified} type="submit">Create USER account</button>
      </form>
    </section>
  );
}

function ProductCatalog({
  cartBusyProductId,
  currentUser,
  filters,
  onCloseDetails,
  onAddToCart,
  onFiltersChange,
  onPageChange,
  onView,
  page,
  products,
  selectedProduct,
}) {
  return (
    <section className="products-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Storefront</p>
          <h1>Products</h1>
        </div>
        <span>{page.totalElements} items</span>
      </div>

      <div className="product-toolbar">
        <label>
          Search
          <input
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value, category: '' })}
            placeholder="Search by product name"
          />
        </label>
        <label>
          Category
          <input
            value={filters.category}
            onChange={(event) => onFiltersChange({ ...filters, category: event.target.value, search: '' })}
            placeholder="Filter category"
          />
        </label>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <h2>No products found</h2>
          <p>Try another search or add products from the admin catalog.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} />
                ) : (
                  <span>{product.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="product-card-body">
                <div>
                  <p className="product-category">{product.category || 'General'}</p>
                  <h2>{product.name}</h2>
                  <p className="product-description-preview">{product.description || 'No description available.'}</p>
                </div>
                <div className="product-card-footer">
                  <strong>{formatCurrency(product.price)}</strong>
                  <div className="row-actions">
                    <button type="button" onClick={() => onView(product.id)}>View</button>
                    <button
                      className="primary"
                      disabled={cartBusyProductId === product.id || product.quantity < 1}
                      type="button"
                      onClick={() => onAddToCart(product.id)}
                    >
                      {cartBusyProductId === product.id ? 'Adding...' : product.quantity < 1 ? 'Out' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="pagination">
        <button disabled={page.number <= 0} type="button" onClick={() => onPageChange(page.number - 1)}>
          Previous
        </button>
        <span>Page {page.number + 1} of {Math.max(page.totalPages, 1)}</span>
        <button
          disabled={page.number + 1 >= page.totalPages}
          type="button"
          onClick={() => onPageChange(page.number + 1)}
        >
          Next
        </button>
      </div>

      {selectedProduct && (
        <ProductDetails
          busy={cartBusyProductId === selectedProduct.id}
          currentUser={currentUser}
          onAddToCart={onAddToCart}
          product={selectedProduct}
          onClose={onCloseDetails}
        />
      )}
    </section>
  );
}

function ProductDetails({ busy, currentUser, onAddToCart, product, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="product-detail" role="dialog" aria-modal="true" aria-labelledby="product-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close product details">
          x
        </button>
        <div className="product-detail-media">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <span>{product.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className="product-category">{product.category || 'General'}</p>
          <h1 id="product-title">{product.name}</h1>
          <p className="lead product-description-full">{product.description || 'No description available.'}</p>
          <dl className="product-facts">
            <div>
              <dt>Price</dt>
              <dd>{formatCurrency(product.price)}</dd>
            </div>
            <div>
              <dt>Available</dt>
              <dd>{product.quantity}</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
          </dl>
          <div className="form-actions">
            <button
              className="primary"
              disabled={busy || product.quantity < 1}
              type="button"
              onClick={() => onAddToCart(product.id)}
            >
              {busy ? 'Adding...' : product.quantity < 1 ? 'Out of stock' : currentUser ? 'Add to cart' : 'Login to add'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CartPage({
  busyProductId,
  cart,
  currentUser,
  onClear,
  onNavigate,
  onRemove,
  onUpdateQuantity,
}) {
  if (!currentUser) {
    return (
      <section className="locked-page">
        <h1>Login required</h1>
        <p>Sign in to view and update your shopping cart.</p>
        <button className="primary" type="button" onClick={() => onNavigate('login')}>Login</button>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your cart</p>
          <h1>Shopping cart</h1>
        </div>
        <span>{cart.totalQuantity} items</span>
      </div>

      {cart.items.length === 0 ? (
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Add products from the storefront and they will appear here.</p>
          <button className="primary" type="button" onClick={() => onNavigate('products')}>Browse products</button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.id || item.productId}>
                <div className="cart-item-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} />
                  ) : (
                    <span>{item.productName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="cart-item-main">
                  <div>
                    <h2>{item.productName}</h2>
                    <p>{item.sku}</p>
                  </div>
                  <strong>{formatCurrency(item.unitPrice)}</strong>
                </div>
                <div className="quantity-stepper" aria-label={`Quantity for ${item.productName}`}>
                  <button
                    disabled={busyProductId === item.productId || item.quantity <= 1}
                    type="button"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                  >
                    -
                  </button>
                  <input
                    min="1"
                    type="number"
                    value={item.quantity}
                    onChange={(event) => onUpdateQuantity(item.productId, Number(event.target.value))}
                  />
                  <button
                    disabled={busyProductId === item.productId}
                    type="button"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <div className="cart-line-actions">
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                  <button
                    className="danger"
                    disabled={busyProductId === item.productId}
                    type="button"
                    onClick={() => onRemove(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <h2>Summary</h2>
            <dl>
              <div>
                <dt>Items</dt>
                <dd>{cart.totalQuantity}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatCurrency(cart.totalAmount)}</dd>
              </div>
            </dl>
            <button className="primary" type="button" onClick={() => onNavigate('products')}>Continue shopping</button>
            <button className="danger" type="button" onClick={onClear}>Clear cart</button>
          </aside>
        </div>
      )}
    </section>
  );
}

function ProductManagement({
  editingProductId,
  form,
  isAdmin,
  onCancel,
  onChange,
  onCreate,
  onDelete,
  onNavigate,
  onSave,
  onStartEdit,
  products,
}) {
  if (!isAdmin) {
    return (
      <section className="locked-page">
        <h1>Admin access required</h1>
        <p>Product changes require an ADMIN token. Product browsing is available from the storefront.</p>
        <button className="primary" type="button" onClick={() => onNavigate('login')}>Login as admin</button>
      </section>
    );
  }

  return (
    <section className="products-admin-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Product catalog</h1>
        </div>
        <button className="primary" type="button" onClick={onCreate}>Add product</button>
      </div>

      {editingProductId && (
        <ProductEditor
          form={form}
          isNew={editingProductId === 'new'}
          onCancel={onCancel}
          onChange={onChange}
          onSave={onSave}
        />
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <span className="table-subtext">{product.category || 'General'}</span>
                </td>
                <td>{product.sku}</td>
                <td>{formatCurrency(product.price)}</td>
                <td>{product.quantity}</td>
                <td><span className="role-pill">{product.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => onStartEdit(product)}>Edit</button>
                    <button className="danger" type="button" onClick={() => onDelete(product.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProductEditor({ form, isNew, onCancel, onChange, onSave }) {
  return (
    <form className="product-editor" onSubmit={onSave}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{isNew ? 'New item' : 'Editing'}</p>
          <h2>{isNew ? 'Add product' : form.name}</h2>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Name
          <input required value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
        </label>
        <label>
          SKU
          <input required value={form.sku} onChange={(event) => onChange({ ...form, sku: event.target.value })} />
        </label>
        <label>
          Price
          <input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => onChange({ ...form, price: event.target.value })} />
        </label>
        <label>
          Quantity
          <input required min="0" step="1" type="number" value={form.quantity} onChange={(event) => onChange({ ...form, quantity: event.target.value })} />
        </label>
        <label>
          Category
          <input value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} />
        </label>
        <label>
          Image URL
          <input type="url" value={form.imageUrl} onChange={(event) => onChange({ ...form, imageUrl: event.target.value })} />
        </label>
        <label className="wide-field">
          Description
          <textarea value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} />
        </label>
        <label className="checkbox-field">
          <input
            checked={form.active}
            type="checkbox"
            onChange={(event) => onChange({ ...form, active: event.target.checked })}
          />
          Active product
        </label>
      </div>
      <div className="form-actions">
        <button className="primary" type="submit">{isNew ? 'Create product' : 'Save product'}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function UserManagement({
  draftUser,
  editingUserId,
  isAdmin,
  onDelete,
  onDraftChange,
  onNavigate,
  onSave,
  onStartEdit,
  onStopEdit,
  users,
}) {
  if (!isAdmin) {
    return (
      <section className="locked-page">
        <h1>Admin access required</h1>
        <p>Your backend should return 403 for this API. The frontend is only preventing accidental navigation.</p>
        <button className="primary" type="button" onClick={() => onNavigate('login')}>Login as admin</button>
      </section>
    );
  }

  return (
    <section className="users-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>User management</h1>
        </div>
        <span>{users.length} users</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isEditing = editingUserId === user.id;

              return (
                <tr key={user.id}>
                  <td>
                    {isEditing ? (
                      <input
                        value={draftUser.name}
                        onChange={(event) => onDraftChange({ ...draftUser, name: event.target.value })}
                      />
                    ) : (
                      user.name
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="email"
                        value={draftUser.email}
                        onChange={(event) => onDraftChange({ ...draftUser, email: event.target.value })}
                        pattern={EMAIL_PATTERN.source}
                      />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        value={draftUser.role}
                        onChange={(event) => onDraftChange({ ...draftUser, role: event.target.value })}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    ) : (
                      <span className="role-pill">{user.role}</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {isEditing ? (
                        <>
                          <button className="primary" type="button" onClick={() => onSave(user.id)}>Save</button>
                          <button type="button" onClick={onStopEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => onStartEdit(user)}>Edit</button>
                          <button className="danger" type="button" onClick={() => onDelete(user.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    style: 'currency',
  }).format(Number(value || 0));
}

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email.trim());
}

function isStrongPassword(password) {
  return PASSWORD_PATTERN.test(password);
}

export default App;
