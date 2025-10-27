"use client";

import React, { type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi-config";
import { RadixProvider } from "@/lib/providers/radixProvider";

const queryClient = new QueryClient();

export function ContextProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RadixProvider>{children}</RadixProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
