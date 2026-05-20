/* ============================================================
   STRIDES - Database Client (Supabase)
   ============================================================ */

// Supabase configuration - these will be set via environment variables
// For GitHub Pages, use this pattern:
//   1. Create a config.js file (not committed) with your keys
//   2. Or set them as GitHub Pages deployment secrets
//   3. Reference via window.__ENV__ or similar

const SUPABASE_URL = window.__STRIDES_SUPABASE_URL__ || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = window.__STRIDES_SUPABASE_ANON_KEY__ || 'YOUR_ANON_KEY';

let supabaseClient = null;

function initSupabase() {
  if (typeof supabase === 'undefined') {
    console.warn('Supabase JS library not loaded. Running in offline mode.');
    return null;
  }
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
  } catch (e) {
    console.error('Failed to initialize Supabase:', e);
    return null;
  }
}

function getSupabase() {
  return supabaseClient;
}

// Check if Supabase is configured
function isSupabaseConfigured() {
  return SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co' &&
         SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY' &&
         supabaseClient !== null;
}

// ---- Local Storage Fallback ----
const LS_KEYS = {
  USER: 'strides_user',
  BALANCE: 'strides_balance',
  HOLDINGS: 'strides_holdings',
  TRANSACTIONS: 'strides_transactions',
  SNAPSHOTS: 'strides_snapshots',
};

function localDB() {
  return {
    getUser() {
      return JSON.parse(localStorage.getItem(LS_KEYS.USER) || 'null');
    },
    setUser(user) {
      localStorage.setItem(LS_KEYS.USER, JSON.stringify(user));
    },
    getBalance() {
      return parseFloat(localStorage.getItem(LS_KEYS.BALANCE) || '100000');
    },
    setBalance(val) {
      localStorage.setItem(LS_KEYS.BALANCE, String(val));
    },
    getHoldings() {
      return JSON.parse(localStorage.getItem(LS_KEYS.HOLDINGS) || '{}');
    },
    setHoldings(holdings) {
      localStorage.setItem(LS_KEYS.HOLDINGS, JSON.stringify(holdings));
    },
    getTransactions() {
      return JSON.parse(localStorage.getItem(LS_KEYS.TRANSACTIONS) || '[]');
    },
    addTransaction(txn) {
      const txns = this.getTransactions();
      txns.unshift(txn);
      if (txns.length > 100) txns.length = 100;
      localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(txns));
    },
    getSnapshots() {
      return JSON.parse(localStorage.getItem(LS_KEYS.SNAPSHOTS) || '{}');
    },
    setSnapshots(snapshots) {
      localStorage.setItem(LS_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
    },
    clearAll() {
      Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
    }
  };
}

// Unified DB interface
const db = {
  local: localDB(),

  async getProfile() {
    if (!isSupabaseConfigured()) return this.local.getUser();
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', (await getSupabase().auth.getUser()).data.user.id)
      .single();
    if (error) throw error;
    return data;
  },

  async updateBalance(amount) {
    this.local.setBalance(amount);
    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase()
      .from('profiles')
      .update({ balance: amount, updated_at: new Date().toISOString() })
      .eq('id', userId);
  },

  async getHoldings() {
    if (!isSupabaseConfigured()) return this.local.getHoldings();
    const { data, error } = await getSupabase()
      .from('holdings')
      .select('*');
    if (error) throw error;
    const holdings = {};
    (data || []).forEach(h => {
      holdings[h.stock_id] = { quantity: h.quantity, avgPrice: parseFloat(h.avg_buy_price) };
    });
    return holdings;
  },

  async upsertHolding(stockId, quantity, avgPrice) {
    // Always update local
    const holdings = this.local.getHoldings();
    holdings[stockId] = { quantity, avgPrice };
    this.local.setHoldings(holdings);

    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase()
      .from('holdings')
      .upsert({
        user_id: userId,
        stock_id: stockId,
        quantity,
        avg_buy_price: avgPrice,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,stock_id' });
  },

  async removeHolding(stockId) {
    const holdings = this.local.getHoldings();
    delete holdings[stockId];
    this.local.setHoldings(holdings);

    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase()
      .from('holdings')
      .delete()
      .eq('user_id', userId)
      .eq('stock_id', stockId);
  },

  async addTransaction(txn) {
    this.local.addTransaction(txn);
    if (!isSupabaseConfigured()) return;
    const userId = (await getSupabase().auth.getUser()).data.user.id;
    await getSupabase()
      .from('transactions')
      .insert({
        user_id: userId,
        stock_id: txn.stockId,
        type: txn.type,
        quantity: txn.quantity,
        price: txn.price,
        total: txn.total,
        created_at: txn.timestamp
      });
  },

  async getTransactions() {
    if (!isSupabaseConfigured()) return this.local.getTransactions();
    const { data, error } = await getSupabase()
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map(t => ({
      stockId: t.stock_id,
      type: t.type,
      quantity: t.quantity,
      price: parseFloat(t.price),
      total: parseFloat(t.total),
      timestamp: t.created_at
    }));
  }
};
