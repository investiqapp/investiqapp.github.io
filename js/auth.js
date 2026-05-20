/* ============================================================
   STRIDES - Authentication Module
   Handles Supabase Auth + local fallback
   ============================================================ */

let currentUser = null;

function initAuth() {
  initSupabase();

  // Check for existing session
  if (isSupabaseConfigured()) {
    getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        showApp();
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        showAuth();
      }
    });

    // Check current session
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        currentUser = session.user;
        showApp();
      } else {
        showAuth();
      }
    });
  } else {
    // Local fallback
    const localUser = db.local.getUser();
    if (localUser) {
      currentUser = localUser;
      showApp();
    } else {
      showAuth();
    }
  }

  setupAuthUI();
}

function setupAuthUI() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('login-form').classList.toggle('hidden', target !== 'login');
      document.getElementById('signup-form').classList.toggle('hidden', target !== 'signup');
      document.getElementById('verify-notice').classList.add('hidden');
    });
  });

  // Login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    errorEl.classList.add('hidden');

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.classList.remove('hidden');
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        showApp();
      } catch (err) {
        errorEl.textContent = err.message || 'Login failed. Check your credentials.';
        errorEl.classList.remove('hidden');
      }
    } else {
      // Local mode
      const localUser = db.local.getUser();
      if (localUser && localUser.email === email) {
        currentUser = localUser;
        showApp();
      } else {
        // Auto-create in local mode
        currentUser = {
          id: 'local_' + Date.now(),
          email,
          username: email.split('@')[0],
          created_at: new Date().toISOString()
        };
        db.local.setUser(currentUser);
        db.local.setBalance(100000);
        showApp();
      }
    }
  });

  // Signup
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const errorEl = document.getElementById('signup-error');

    errorEl.classList.add('hidden');

    if (!username || !email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.classList.remove('hidden');
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters';
      errorEl.classList.remove('hidden');
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase().auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: username }
          }
        });
        if (error) throw error;

        // Check if email confirmation is needed
        if (data.user && !data.session) {
          document.getElementById('signup-form').classList.add('hidden');
          document.getElementById('verify-notice').classList.remove('hidden');
        } else if (data.session) {
          currentUser = data.user;
          showApp();
        }
      } catch (err) {
        errorEl.textContent = err.message || 'Signup failed. Try again.';
        errorEl.classList.remove('hidden');
      }
    } else {
      // Local mode
      currentUser = {
        id: 'local_' + Date.now(),
        email,
        username,
        created_at: new Date().toISOString()
      };
      db.local.setUser(currentUser);
      db.local.setBalance(100000);
      showApp();
    }
  });

  // Back to login from verify
  document.getElementById('back-to-login').addEventListener('click', () => {
    document.getElementById('verify-notice').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.querySelector('.auth-tab[data-tab="login"]').click();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    if (isSupabaseConfigured()) {
      await getSupabase().auth.signOut();
    }
    currentUser = null;
    db.local.clearAll();
    showAuth();
  });
}

function showAuth() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
}

function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');

  // Initialize the app
  if (window.initApp) window.initApp();
}

function getCurrentUser() {
  return currentUser;
}
