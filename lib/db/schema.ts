import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Table to track PoP NFT claims
 * Ensures one person can only claim one NFT
 */
export const popClaims = pgTable('pop_claims', {
  userId: text('user_id').primaryKey().notNull(),
  credentialId: text('credential_id').notNull(), // Also used as NFT ID
  radixAddress: text('radix_address').notNull(), // First wallet that claimed
  evmAddress: text('evm_address').notNull(), // EVM wallet used for verification
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
});

export type PopClaim = typeof popClaims.$inferSelect;
export type NewPopClaim = typeof popClaims.$inferInsert;
