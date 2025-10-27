// Server-side session store for verified users
// In production, use Redis or a database

interface VerifiedSession {
  radixAddress: string;
  evmAddress: string; // EVM wallet used for idOS verification
  userId: string; // idOS user ID for deduplication
  idosCredentials: {
    credentialId: string;
    issuerId: string;
  }[];
  rolaVerifiedAt: number;
  credentialsVerifiedAt: number;
  expiresAt: number;
}

// Use globalThis to persist across HMR in development
const globalForSessions = globalThis as unknown as {
  sessions: Map<string, VerifiedSession> | undefined;
  cleanupInterval: NodeJS.Timeout | undefined;
};

const sessions = globalForSessions.sessions ?? new Map<string, VerifiedSession>();
globalForSessions.sessions = sessions;

// Clean up expired sessions every 10 minutes
if (!globalForSessions.cleanupInterval) {
  globalForSessions.cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessions.entries()) {
      if (now > value.expiresAt) {
        sessions.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export const sessionStore = {
  // Create or update session after ROLA verification
  setRadixVerification: (radixAddress: string): void => {
    const now = Date.now();
    const existing = sessions.get(radixAddress);

    if (existing) {
      existing.rolaVerifiedAt = now;
      existing.expiresAt = now + 30 * 60 * 1000; // 30 minutes
    } else {
      sessions.set(radixAddress, {
        radixAddress,
        evmAddress: '',
        userId: '',
        idosCredentials: [],
        rolaVerifiedAt: now,
        credentialsVerifiedAt: 0,
        expiresAt: now + 30 * 60 * 1000, // 30 minutes
      });
    }
  },

  // Add verified idOS credentials to session
  setCredentialVerification: (
    radixAddress: string,
    evmAddress: string,
    userId: string,
    credentials: { credentialId: string; issuerId: string }[]
  ): void => {
    const existing = sessions.get(radixAddress);

    if (!existing) {
      throw new Error('No ROLA verification found. Please verify Radix account first.');
    }

    const now = Date.now();
    existing.evmAddress = evmAddress;
    existing.userId = userId;
    existing.idosCredentials = credentials;
    existing.credentialsVerifiedAt = now;
    existing.expiresAt = now + 30 * 60 * 1000; // Extend session
  },

  // Validate that a session is complete and ready for minting
  validateMintingSession: (radixAddress: string): {
    valid: boolean;
    session?: VerifiedSession;
    error?: string;
  } => {
    const session = sessions.get(radixAddress);

    if (!session) {
      return { valid: false, error: 'No verification session found' };
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      sessions.delete(radixAddress);
      return { valid: false, error: 'Session expired. Please verify again.' };
    }

    if (!session.rolaVerifiedAt || session.rolaVerifiedAt === 0) {
      return { valid: false, error: 'Radix account not verified with ROLA' };
    }

    if (session.idosCredentials.length === 0) {
      return { valid: false, error: 'No verified idOS credentials found' };
    }

    if (!session.credentialsVerifiedAt || session.credentialsVerifiedAt === 0) {
      return { valid: false, error: 'idOS credentials not verified' };
    }

    return { valid: true, session };
  },

  // Mark session as NFT minted (prevents double minting)
  markAsMinted: (radixAddress: string): void => {
    sessions.delete(radixAddress);
  },

  // Debug: Get all sessions
  getAllSessions: (): VerifiedSession[] => {
    return Array.from(sessions.values());
  },
};
