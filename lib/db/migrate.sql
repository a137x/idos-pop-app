-- Create pop_claims table for tracking NFT claims
-- Ensures one person (userId) can only claim one NFT

CREATE TABLE IF NOT EXISTS pop_claims (
  user_id TEXT PRIMARY KEY NOT NULL,
  credential_id TEXT NOT NULL,
  radix_address TEXT NOT NULL,
  evm_address TEXT NOT NULL,
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster lookups by Radix address
CREATE INDEX IF NOT EXISTS idx_pop_claims_radix_address ON pop_claims(radix_address);

-- Create index for faster lookups by credential ID
CREATE INDEX IF NOT EXISTS idx_pop_claims_credential_id ON pop_claims(credential_id);
