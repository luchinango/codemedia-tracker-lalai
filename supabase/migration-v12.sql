-- Migration V12: Exchange rate history table
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate DECIMAL(10, 4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'binance_p2p',
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recorded_at, source)
);

-- Index for quick date lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rate_date ON exchange_rate_history(recorded_at DESC);
