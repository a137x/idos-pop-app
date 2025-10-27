import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { popClaims, type PopClaim } from './db/schema';

/**
 * Check if a userId has already minted an NFT
 * @param userId - The unique idOS user ID
 * @returns The full claim record if already claimed, null otherwise
 */
export async function getExistingClaim(userId: string): Promise<PopClaim | null> {
  const result = await db
    .select()
    .from(popClaims)
    .where(eq(popClaims.userId, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Record a new NFT claim
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
  await db.insert(popClaims).values({
    userId,
    credentialId,
    radixAddress,
    evmAddress,
  });
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
