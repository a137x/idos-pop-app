import { useEffect, useState } from 'react';
import { useRadix } from './useRadix';
import type { Account } from '@radixdlt/radix-dapp-toolkit';

export const useRadixAccounts = () => {
  const { rdt } = useRadix();
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (!rdt) return;

    const subscription = rdt.walletApi.walletData$.subscribe((walletData) => {
      setAccounts(walletData.accounts || []);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [rdt]);

  return accounts;
};
