-- This script will remove duplicate tickers from the contract_tickers array
-- It keeps only the first occurrence of each transaction_hash

-- First, let's create a function to deduplicate tickers
CREATE OR REPLACE FUNCTION deduplicate_tickers() RETURNS void AS $$
DECLARE
  creator_record RECORD;
  unique_tickers JSONB;
  seen_hashes TEXT[];
  ticker JSONB;
BEGIN
  FOR creator_record IN SELECT id, wallet_address, contract_tickers FROM creators
  LOOP
    unique_tickers := '[]'::jsonb;
    seen_hashes := '{}';
    
    -- Process each ticker in the array
    FOR ticker IN SELECT jsonb_array_elements(creator_record.contract_tickers)
    LOOP
      -- Check if this transaction_hash has been seen before
      IF ticker->>'transaction_hash' IS NULL OR NOT (ticker->>'transaction_hash' = ANY(seen_hashes)) THEN
        -- Add to unique tickers
        unique_tickers := unique_tickers || ticker;
        
        -- Add hash to seen list if it exists
        IF ticker->>'transaction_hash' IS NOT NULL THEN
          seen_hashes := array_append(seen_hashes, ticker->>'transaction_hash');
        END IF;
      END IF;
    END LOOP;
    
    -- Update the record with deduplicated tickers
    UPDATE creators 
    SET 
      contract_tickers = unique_tickers,
      contracts_created = jsonb_array_length(unique_tickers)
    WHERE id = creator_record.id;
    
    RAISE NOTICE 'Updated creator %: removed % duplicate tickers', 
      creator_record.wallet_address, 
      jsonb_array_length(creator_record.contract_tickers) - jsonb_array_length(unique_tickers);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the deduplication function
SELECT deduplicate_tickers();

-- Output the results
SELECT 
  wallet_address, 
  contracts_created, 
  jsonb_array_length(contract_tickers) as ticker_count
FROM creators
ORDER BY contracts_created DESC;
