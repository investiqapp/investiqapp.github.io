/* ============================================================
   InvestIQ - Environment Configuration
   ============================================================
   
   The Supabase ANON KEY and Twelve Data API key are designed
   to be public (like a Firebase API key). Security is handled
   by Row Level Security (RLS) on the Supabase side.
   
   ⚠️  NEVER put your SUPABASE SERVICE ROLE KEY here.
   ✅  The anon key is safe to commit.
   ============================================================ */

// Supabase — for auth + database
window.__INVESTIQ_SUPABASE_URL__ = 'https://objmhmnraikgjpfzudpt.supabase.co';
window.__INVESTIQ_SUPABASE_ANON_KEY__ = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iam1obW5yYWlrZ2pwZnp1ZHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjIzNDAsImV4cCI6MjA5NDgzODM0MH0.DAxBc0xab4Mw6ng18oilQ8HFAjbGNYkAS8Oo6flviWU';

// Twelve Data — free API key for real stock prices
// Sign up at https://twelvedata.com — free tier: 800 credits/day
window.__INVESTIQ_TWELVEDATA_KEY__ = 'YOUR_TWELVE_DATA_KEY';
