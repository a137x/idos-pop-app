'use client';

import { createContext, useEffect, useState } from 'react';
import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';
import { getNetworkId, getDappDefinitionAddress } from '@/lib/radix/network-config';

type RadixContextType = {
  rdt: RadixDappToolkit | null;
};

export const RadixContext = createContext<RadixContextType>({ rdt: null });

let rdtSingleton: RadixDappToolkit | undefined = undefined;

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
