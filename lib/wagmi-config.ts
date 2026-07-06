import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, polygon, arbitrum, base } from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "wagmi";

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId) {
  console.warn("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
}

// Create wagmiAdapter
export const networks = [mainnet, polygon, arbitrum, base];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks: networks as any,
});

export const config = wagmiAdapter.wagmiConfig;

// Create the AppKit instance
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: networks as any,
  defaultNetwork: mainnet,
  metadata: {
    name: "OTER Proof of Personhood",
    description: "Verify personhood via idOS FaceSign and claim your PoP NFT on Radix",
    url: typeof window !== "undefined" ? window.location.origin : "",
    icons: ["https://oter.io/apple-touch-icon.png"],
  },
  features: {
    analytics: false,
  },
});
