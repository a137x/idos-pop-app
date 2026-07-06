'use client';

import { createContext, useEffect, useState } from 'react';
import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { getNetworkId, getDappDefinitionAddress } from '@/lib/radix/network-config';

type RadixContextType = {
  rdt: RadixDappToolkit | null;
};

export const RadixContext = createContext<RadixContextType>({ rdt: null });

let rdtSingleton: RadixDappToolkit | undefined = undefined;

// One-shot ROLA challenge override. RDT has a single global challenge
// generator; normal account verification uses a random backend challenge,
// but the Radix→idOS login-key bridge needs the wallet to sign a FIXED
// derivation challenge (see lib/radix/idos-signer.ts). Set the override
// immediately before sendOneTimeRequest — it is consumed by the next
// challenge request and cleared.
let nextChallengeOverride: string | null = null;

export function setNextRolaChallenge(challenge: string) {
  nextChallengeOverride = challenge;
}

export function RadixProvider({ children }: { children: React.ReactNode }) {
  const [rdt, setRdt] = useState<RadixDappToolkit | undefined>(undefined);

  useEffect(() => {
    // RDT is not available on server
    if (typeof window === 'undefined') return;

    // Create singleton instance
    const rdtInstance =
      rdtSingleton ??
      RadixDappToolkit({
        dAppDefinitionAddress: getDappDefinitionAddress(),
        networkId: getNetworkId(),
        // ASCII only — forwarded as a gateway HTTP header (RDX-App-Name)
        applicationName: 'OTER Proof of Personhood',
        applicationVersion: '1.0.0',
      });

    if (!rdtSingleton) {
      rdtSingleton = rdtInstance;
    }

    setRdt(rdtInstance);

    // Set theme
    rdtInstance.buttonApi.setMode('dark');
    rdtInstance.buttonApi.setTheme('white');

    return () => {
      // Don't destroy singleton on unmount
    };
  }, []);

  // Set up challenge generator when RDT is ready
  useEffect(() => {
    if (!rdt) return;

    rdt.walletApi.provideChallengeGenerator(async () => {
      // Consume a pending one-shot override (derivation challenge) first
      if (nextChallengeOverride) {
        const challenge = nextChallengeOverride;
        nextChallengeOverride = null;
        return challenge;
      }
      try {
        // Fetch challenge from backend
        const response = await fetch('/api/radix/challenge');
        const data = await response.json();

        if (!data.challenge) {
          throw new Error('Failed to get challenge from server');
        }

        return data.challenge;
      } catch (error) {
        console.error('[RadixProvider] Failed to generate challenge:', error);
        throw error;
      }
    });
  }, [rdt]);

  return (
    <RadixContext.Provider value={{ rdt: rdt ?? null }}>
      {children}
    </RadixContext.Provider>
  );
}
