/**
 * pop_claims — tracks PoP NFT claims. Ensures one person (idOS userId) can
 * only claim one NFT: the record id IS the userId, so a second CREATE for the
 * same person fails atomically inside SurrealDB ("already exists").
 */

export const POP_CLAIMS_TABLE = 'pop_claims';

/** Idempotent schema bootstrap — safe to run on every process start. */
export const POP_CLAIMS_DDL = `
DEFINE TABLE IF NOT EXISTS pop_claims SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS user_id ON pop_claims TYPE string;
DEFINE FIELD IF NOT EXISTS credential_id ON pop_claims TYPE string;
DEFINE FIELD IF NOT EXISTS radix_address ON pop_claims TYPE string;
DEFINE FIELD IF NOT EXISTS evm_address ON pop_claims TYPE string;
DEFINE FIELD IF NOT EXISTS claimed_at ON pop_claims TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS idx_pop_claims_credential_id ON pop_claims FIELDS credential_id;
DEFINE INDEX IF NOT EXISTS idx_pop_claims_radix_address ON pop_claims FIELDS radix_address;
`;

/** Row shape as returned by SurrealDB (snake_case, datetime as ISO string). */
export interface PopClaimRow {
  id: string;
  user_id: string;
  credential_id: string;
  radix_address: string;
  evm_address: string;
  claimed_at: string;
}

/** API-facing claim shape (kept identical to the previous drizzle model). */
export interface PopClaim {
  userId: string;
  credentialId: string; // Also used as NFT ID
  radixAddress: string; // First wallet that claimed
  evmAddress: string; // EVM wallet used for verification
  claimedAt: string; // ISO timestamp
}

export function rowToClaim(row: PopClaimRow): PopClaim {
  return {
    userId: row.user_id,
    credentialId: row.credential_id,
    radixAddress: row.radix_address,
    evmAddress: row.evm_address,
    claimedAt: row.claimed_at,
  };
}
