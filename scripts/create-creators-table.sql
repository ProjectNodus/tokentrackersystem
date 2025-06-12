-- Create the creators table
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  contracts_created INTEGER NOT NULL DEFAULT 1,
  contract_tickers JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_contract_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS creators_wallet_address_idx ON creators (wallet_address);
CREATE INDEX IF NOT EXISTS creators_contracts_created_idx ON creators (contracts_created DESC);
CREATE INDEX IF NOT EXISTS creators_last_contract_at_idx ON creators (last_contract_at DESC);

-- Create a GIN index for the JSONB array to enable efficient searching within tickers
CREATE INDEX IF NOT EXISTS creators_contract_tickers_idx ON creators USING GIN (contract_tickers);

-- Create a function to add a contract to a creator
-- This function will:
-- 1. Create a new creator if they don't exist
-- 2. Increment the contracts_created count if they do exist
-- 3. Add the new ticker to the contract_tickers array
-- 4. Update the last_contract_at timestamp
CREATE OR REPLACE FUNCTION add_creator_contract(
  creator_wallet TEXT,
  ticker_symbol TEXT,
  token_name TEXT DEFAULT NULL,
  token_address TEXT DEFAULT NULL,
  transaction_hash TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  creator_id UUID;
  new_ticker JSONB;
BEGIN
  -- Create the ticker JSON object
  new_ticker := jsonb_build_object(
    'symbol', ticker_symbol,
    'name', token_name,
    'address', token_address,
    'transaction_hash', transaction_hash,
    'created_at', NOW()
  );

  -- Check if the creator already exists
  SELECT id INTO creator_id FROM creators WHERE wallet_address = creator_wallet;
  
  IF creator_id IS NULL THEN
    -- Create a new creator
    INSERT INTO creators (
      wallet_address,
      contracts_created,
      contract_tickers,
      first_seen_at,
      last_contract_at
    ) VALUES (
      creator_wallet,
      1,
      jsonb_build_array(new_ticker),
      NOW(),
      NOW()
    ) RETURNING id INTO creator_id;
  ELSE
    -- Update existing creator
    UPDATE creators
    SET
      contracts_created = contracts_created + 1,
      contract_tickers = contract_tickers || new_ticker,
      last_contract_at = NOW(),
      updated_at = NOW()
    WHERE id = creator_id;
  END IF;
  
  RETURN creator_id;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creators_modtime
BEFORE UPDATE ON creators
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
