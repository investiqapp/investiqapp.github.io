/* ============================================================
   InvestIQ - Authentication
   Supabase Auth + localStorage fallback
   ============================================================ */

let currentUser = null;

function initAuth() {
  initSupabase();

  if (isSupabaseConfigured()) {
    getSupabase().auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        setCurrentUser({ id: currentUser.id, email: currentUser.email });
        await db.syncFromSupabase();
        showApp();
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        clearCurrentUser();
        showAuth();
      }
    });

    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        currentUser = session.user;
        setCurrentUser({ id: currentUser.id, email: currentUser.email });
        await db.syncFromSupabase();
        showApp();
      } else {
        showAuth();
      }
    });
  } else {
    const savedUser = JSON.parse(localStorage.getItem('investiq_current_user') || 'null');
    if (savedUser) {
      currentUser = savedUser;
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

    if (!email || !password) { errorEl.textContent = 'Please fill in all fields'; errorEl.classList.remove('hidden'); return; }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        setCurrentUser({ id: currentUser.id, email: currentUser.email });
        await db.syncFromSupabase();
        showApp();
      } catch (err) {
        errorEl.textContent = err.message || 'Login failed. Check your credentials.';
        errorEl.classList.remove('hidden');
      }
    } else {
      // Local mode: find or create user keyed by email
      const userId = 'local_' + email.replace(/[^a-z0-9]/gi, '_');
      currentUser = { id: userId, email, username: email.split('@')[0] };
      setCurrentUser(currentUser);

      // If this user has no data yet, init with 100k
      if (!db.local.getUser()) {
        db.local.setUser(currentUser);
        db.local.setBalance(100000);
      }
      showApp();
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

    if (!username || !email || !password) { errorEl.textContent = 'Please fill in all fields'; errorEl.classList.remove('hidden'); return; }
    if (password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters'; errorEl.classList.remove('hidden'); return; }

    if (isSupabaseConfigured()) {
      try {
        const redirectUrl = window.location.origin + window.location.pathname;
        const { data, error } = await getSupabase().auth.signUp({
          email, password,
          options: {
            data: { username, display_name: username },
            emailRedirectTo: redirectUrl
          }
        });
        if (error) throw error;

        if (data.user && !data.session) {
          // Email verification needed — show notice
          document.getElementById('verify-email-display').textContent = email;
          document.getElementById('signup-form').classList.add('hidden');
          document.getElementById('verify-notice').classList.remove('hidden');
        } else if (data.session) {
          currentUser = data.user;
          setCurrentUser({ id: currentUser.id, email: currentUser.email });
          showApp();
        }
      } catch (err) {
        errorEl.textContent = err.message || 'Signup failed. Try again.';
        errorEl.classList.remove('hidden');
      }
    } else {
      const userId = 'local_' + email.replace(/[^a-z0-9]/gi, '_');
      currentUser = { id: userId, email, username };
      setCurrentUser(currentUser);
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
      // onAuthStateChange handles the rest
    } else {
      // Local mode: just clear current user reference, keep data
      currentUser = null;
      clearCurrentUser();
      showAuth();
    }
  });
}

function showAuth() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
}

function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  if (window.initApp) window.initApp();
}

function getCurrentUser() { return currentUser; }
