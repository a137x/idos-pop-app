import { ensureSchema, surrealQuery, surrealStr } from './db/client';
import {
  POP_CLAIMS_TABLE,
  rowToClaim,
  type PopClaim,
  type PopClaimRow,
} from './db/schema';

export type { PopClaim };

/**
 * Check if a userId has already minted an NFT
 * @param userId - The unique idOS user ID
 * @returns The full claim record if already claimed, null otherwise
 */
export async function getExistingClaim(userId: string): Promise<PopClaim | null> {
  await ensureSchema();
  const rows = await surrealQuery<PopClaimRow>(
    `SELECT * FROM type::record(${surrealStr(POP_CLAIMS_TABLE)}, ${surrealStr(userId)});`
  );
  return rows[0] ? rowToClaim(rows[0]) : null;
}

/**
 * Record a new NFT claim
 * The record id is the userId itself, so a concurrent double-claim fails
 * atomically inside SurrealDB ("already exists") — no unique index needed.
 * @param userId - The unique idOS user ID
 * @param credentialId - The credential ID (also used as NFT ID)
 * @param radixAddress - The Radix wallet address that received the NFT
 * @param evmAddress - The EVM wallet address used for verification
 */
export async function recordClaim(
  userId: string,
  credentialId: string,
  radixAddress: string,
  evmAddress: string
): Promise<void> {
  await ensureSchema();
  await surrealQuery(
    `CREATE type::record(${surrealStr(POP_CLAIMS_TABLE)}, ${surrealStr(userId)}) CONTENT {
      user_id: ${surrealStr(userId)},
      credential_id: ${surrealStr(credentialId)},
      radix_address: ${surrealStr(radixAddress)},
      evm_address: ${surrealStr(evmAddress)}
    };`
  );
}

/**
 * Check if already claimed and return result with claim details if exists
 * @param userId - The unique idOS user ID
 * @returns Object with claimed status and claim details if exists
 */
export async function checkClaim(userId: string): Promise<{
  claimed: boolean;
  claim?: PopClaim;
}> {
  const claim = await getExistingClaim(userId);
  return {
    claimed: !!claim,
    claim: claim || undefined,
  };
}
