-- ============================================================
-- STRIDES - Supabase Database Schema
-- Student Trading & Real-time Investment Development Education Simulator
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- Stores user profile data linked to Supabase Auth
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  balance NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. HOLDINGS TABLE
-- Current stock holdings for each user
-- ============================================================
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stock_id TEXT NOT NULL, -- e.g., 'RELIANCE', 'TCS'
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, stock_id)
);

-- ============================================================
-- 3. TRANSACTIONS TABLE
-- Records every buy/sell transaction
-- ============================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stock_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(15,2) NOT NULL CHECK (price > 0),
  total NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. STOCK_SNAPSHOTS TABLE
-- Historical price data for charting
-- ============================================================
CREATE TABLE public.stock_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id TEXT NOT NULL,
  open_price NUMERIC(15,2) NOT NULL,
  high_price NUMERIC(15,2) NOT NULL,
  low_price NUMERIC(15,2) NOT NULL,
  close_price NUMERIC(15,2) NOT NULL,
  volume INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast chart queries
CREATE INDEX idx_snapshots_stock_time ON public.stock_snapshots(stock_id, recorded_at DESC);

-- ============================================================
-- 5. LEADERBOARD VIEW
-- Aggregated view for leaderboard rankings
-- ============================================================
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  p.display_name,
  p.balance,
  COALESCE(SUM(h.quantity * h.avg_buy_price), 0) AS total_investment,
  p.balance + COALESCE(SUM(h.quantity * h.avg_buy_price), 0) AS total_value,
  RANK() OVER (ORDER BY p.balance + COALESCE(SUM(h.quantity * h.avg_buy_price), 0) DESC) AS rank
FROM public.profiles p
LEFT JOIN public.holdings h ON p.id = h.user_id
GROUP BY p.id, p.username, p.display_name, p.balance;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_snapshots ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can see leaderboard (read-only view)
-- The leaderboard view is public for reading

-- HOLDINGS: Users can only manage their own holdings
CREATE POLICY "Users can view own holdings"
  ON public.holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own holdings"
  ON public.holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own holdings"
  ON public.holdings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own holdings"
  ON public.holdings FOR DELETE
  USING (auth.uid() = user_id);

-- TRANSACTIONS: Users can only view/insert their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- STOCK_SNAPSHOTS: Readable by all authenticated users, writable by service role
CREATE POLICY "Authenticated users can view snapshots"
  ON public.stock_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- HELPER: Deduct balance safely (prevents negative balance)
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT balance INTO current_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  UPDATE public.profiles SET balance = balance - p_amount, updated_at = now() WHERE id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HELPER: Add balance
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_balance(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET balance = balance + p_amount, updated_at = now() WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
