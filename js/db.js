/* ============================================================
   InvestIQ - Database Client (Supabase + localStorage)
   ============================================================ */

const SUPABASE_URL = window.__INVESTIQ_SUPABASE_URL__ || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = window.__INVESTIQ_SUPABASE_ANON_KEY__ || 'YOUR_ANON_KEY';

let supabaseClient = null;

function initSupabase() {
  if (typeof supabase === 'undefined') { console.warn('Supabase JS not loaded. Offline mode.'); return null; }
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  } catch (e) { console.error('Supabase init failed:', e); return null; }
}

function getSupabase() { return supabaseClient; }
function isSupabaseConfigured() {
  return SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' &&
         SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY' && supabaseClient !== null;
}

/* ---- localStorage with user-scoped keys ---- */
function lsKey(suffix) {
  const u = JSON.parse(localStorage.getItem('investiq_current_user') || 'null');
  const prefix = u ? u.id : 'anon';
  return 'investiq_' + prefix + '_' + suffix;
}

function setCurrentUser(user) {
  localStorage.setItem('investiq_current_user', JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem('investiq_current_user');
}

const db = {
  local: {
    getUser() { return JSON.parse(localStorage.getItem(lsKey('user')) || 'null'); },
    setUser(user) { localStorage.setItem(lsKey('user'), JSON.stringify(user)); },
    getBalance() { return parseFloat(localStorage.getItem(lsKey('balance')) || '100000'); },
    setBalance(val) { localStorage.setItem(lsKey('balance'), String(val)); },
    getHoldings() { return JSON.parse(localStorage.getItem(lsKey('holdings')) || '{}'); },
    setHoldings(h) { localStorage.setItem(lsKey('holdings'), JSON.stringify(h)); },
    getTransactions() { return JSON.parse(localStorage.getItem(lsKey('transactions')) || '[]'); },
    addTransaction(txn) {
      const txns = this.getTransactions();
      txns.unshift(txn);
      if (txns.length > 100) txns.length = 100;
      localStorage.setItem(lsKey('transactions'), JSON.stringify(txns));
    },
    clearUser() {
      // Only clear THIS user's data — not other users
      const u = JSON.parse(localStorage.getItem('investiq_current_user') || 'null');
      if (!u) return;
      const prefix = 'investiq_' + u.id + '_';
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(prefix)) localStorage.removeItem(k);
      });
    }
  },

  /* ---- Supabase-backed operations ---- */
  async getProfile() {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await getSupabase().from('profiles').select('*').eq('id', (await getSupabase().auth.getUser()).data.user.id).single();
    if (error) throw error;
    return data;
  },

  async updateBalance(amount) {
    this.local.setBalance(amount);
    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase().from('profiles').update({ balance: amount, updated_at: new Date().toISOString() }).eq('id', userId);
  },

  async getHoldingsFromDB() {
    if (!isSupabaseConfigured()) return {};
    const { data, error } = await getSupabase().from('holdings').select('*');
    if (error) throw error;
    const holdings = {};
    (data || []).forEach(h => { holdings[h.stock_id] = { quantity: h.quantity, avgPrice: parseFloat(h.avg_buy_price) }; });
    return holdings;
  },

  async upsertHolding(stockId, quantity, avgPrice) {
    this.local.setHoldings({ ...this.local.getHoldings(), [stockId]: { quantity, avgPrice } });
    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase().from('holdings').upsert({
      user_id: userId, stock_id: stockId, quantity, avg_buy_price: avgPrice, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,stock_id' });
  },

  async removeHolding(stockId) {
    const h = this.local.getHoldings(); delete h[stockId]; this.local.setHoldings(h);
    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase().from('holdings').delete().eq('user_id', userId).eq('stock_id', stockId);
  },

  async addTransaction(txn) {
    this.local.addTransaction(txn);
    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase().from('transactions').insert({
      user_id: userId, stock_id: txn.stockId, type: txn.type, quantity: txn.quantity,
      price: txn.price, total: txn.total, created_at: txn.timestamp
    });
  },

  async getTransactionsFromDB() {
    if (!isSupabaseConfigured()) return this.local.getTransactions();
    const { data, error } = await getSupabase().from('transactions').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return (data || []).map(t => ({
      stockId: t.stock_id, type: t.type, quantity: t.quantity,
      price: parseFloat(t.price), total: parseFloat(t.total), timestamp: t.created_at
    }));
  },

  /* ---- Sync from Supabase on login ---- */
  async syncFromSupabase() {
    if (!isSupabaseConfigured()) return;
    try {
      const profile = await this.getProfile();
      if (profile) this.local.setBalance(parseFloat(profile.balance));

      const holdings = await this.getHoldingsFromDB();
      this.local.setHoldings(holdings);

      const txns = await this.getTransactionsFromDB();
      localStorage.setItem(lsKey('transactions'), JSON.stringify(txns));
    } catch (e) {
      console.warn('Supabase sync failed:', e);
    }
  }
};
