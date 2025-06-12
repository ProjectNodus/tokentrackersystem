-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tokens table
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT UNIQUE NOT NULL,
  creator_address TEXT NOT NULL,
  name TEXT,
  symbol TEXT,
  total_supply BIGINT,
  transaction_hash TEXT UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  method_id TEXT,
  method_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create creator_profiles table
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  twitter_handle TEXT,
  telegram_handle TEXT,
  website_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  key_price BIGINT DEFAULT 0,
  total_holders INTEGER DEFAULT 0,
  volume BIGINT DEFAULT 0,
  supply INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contract_transactions table
CREATE TABLE IF NOT EXISTS contract_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hash TEXT UNIQUE NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  value_wei BIGINT NOT NULL DEFAULT 0,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  method_id TEXT,
  method_name TEXT,
  transaction_type TEXT NOT NULL,
  description TEXT,
  gas_used BIGINT,
  gas_price BIGINT,
  status TEXT DEFAULT 'success',
  token_id UUID REFERENCES tokens(id),
  creator_profile_id UUID REFERENCES creator_profiles(id),
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tokens_creator_address ON tokens(creator_address);
CREATE INDEX IF NOT EXISTS idx_tokens_timestamp ON tokens(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_block_number ON tokens(block_number DESC);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_wallet_address ON creator_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles(username);

CREATE INDEX IF NOT EXISTS idx_contract_transactions_hash ON contract_transactions(hash);
CREATE INDEX IF NOT EXISTS idx_contract_transactions_from_address ON contract_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_contract_transactions_timestamp ON contract_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contract_transactions_type ON contract_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_contract_transactions_block_number ON contract_transactions(block_number DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
