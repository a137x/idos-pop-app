// Simple in-memory challenge store
// In production, you'd want to use a database or Redis

interface Challenge {
  challenge: string;
  createdAt: number;
  expiresAt: number;
}

// Use globalThis to persist across HMR in development
const globalForChallenges = globalThis as unknown as {
  challenges: Map<string, Challenge> | undefined;
  cleanupInterval: NodeJS.Timeout | undefined;
};

const challenges = globalForChallenges.challenges ?? new Map<string, Challenge>();
globalForChallenges.challenges = challenges;

// Clean up expired challenges every 5 minutes (only set up once)
if (!globalForChallenges.cleanupInterval) {
  globalForChallenges.cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of challenges.entries()) {
      if (now > value.expiresAt) {
        challenges.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export const challengeStore = {
  create: (challenge: string, ttlMs: number = 5 * 60 * 1000): void => {
    const now = Date.now();
    challenges.set(challenge, {
      challenge,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
  },

  verify: (challenge: string): boolean => {
    const stored = challenges.get(challenge);
    if (!stored) {
      return false;
    }

    const now = Date.now();
    if (now > stored.expiresAt) {
      challenges.delete(challenge);
      return false;
    }

    return true;
  },

  consume: (challenge: string): boolean => {
    const isValid = challengeStore.verify(challenge);
    if (isValid) {
      challenges.delete(challenge);
    }
    return isValid;
  },

  // Debug method
  getAllChallenges: (): string[] => {
    return Array.from(challenges.keys());
  },
};
