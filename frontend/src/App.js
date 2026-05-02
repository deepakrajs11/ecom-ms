import { useEffect, useState } from 'react';
import './App.css';
import {
  deleteUserById,
  getCurrentUser,
  getUsers,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  sendEmailOtp,
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

const pathToPage = {
  '/': 'home',
  '/login': 'login',
  '/register': 'register',
  '/forgot-password': 'forgotPassword',
  '/users': 'users',
  '/profile': 'profile',
};

const pageToPath = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
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
    setNotice('Signed out.');
    navigate('home');
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

function Navbar({ activePage, authChecked, currentUser, isAdmin, onNavigate, onLogout }) {
  return (
    <header className="navbar">
      <button className="brand" type="button" onClick={() => onNavigate('home')}>
        Star Shop
      </button>

      <nav aria-label="Primary navigation">
        <button className={activePage === 'home' ? 'active' : ''} type="button" onClick={() => onNavigate('home')}>
          Home
        </button>
        {isAdmin && (
          <button className={activePage === 'users' ? 'active' : ''} type="button" onClick={() => onNavigate('users')}>
            Users
          </button>
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
          <button className="primary" type="button" onClick={() => onNavigate(currentUser ? (isAdmin ? 'users' : 'profile') : 'login')}>
            {currentUser ? 'Open account' : 'Start with login'}
          </button>
          <button type="button" onClick={() => onNavigate('register')}>Create account</button>
        </div>
      </div>

      <div className="status-panel" aria-label="Architecture checklist">
        <h2>Frontend boundaries</h2>
        <ul>
          <li>Register always sends role USER.</li>
          <li>Login stores the access token returned by the backend.</li>
          <li>Protected requests send Authorization: Bearer token.</li>
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

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email.trim());
}

function isStrongPassword(password) {
  return PASSWORD_PATTERN.test(password);
}

export default App;
