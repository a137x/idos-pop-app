import { NetworkId } from '@radixdlt/radix-engine-toolkit';

export type RadixNetwork = 'mainnet' | 'stokenet';

type NetworkConfig = {
  networkId: number;
  gatewayUrl: string;
  dashboardUrl: string;
};

const NETWORK_CONFIGS: Record<RadixNetwork, NetworkConfig> = {
  mainnet: {
    networkId: NetworkId.Mainnet,
    gatewayUrl: 'https://mainnet.radixdlt.com',
    dashboardUrl: 'https://dashboard.radixdlt.com',
  },
  stokenet: {
    networkId: NetworkId.Stokenet,
    gatewayUrl: 'https://stokenet.radixdlt.com',
    dashboardUrl: 'https://stokenet-dashboard.radixdlt.com',
  },
};

/**
 * Get the current network from environment variables
 * Defaults to stokenet if not set or invalid
 */
export function getCurrentNetwork(): RadixNetwork {
  const network = process.env.NEXT_PUBLIC_RADIX_NETWORK?.toLowerCase();

  if (network === 'mainnet' || network === 'stokenet') {
    return network;
  }

  console.warn(
    `Invalid NEXT_PUBLIC_RADIX_NETWORK: "${network}". Defaulting to stokenet. Valid options: "mainnet" or "stokenet"`
  );
  return 'stokenet';
}

/**
 * Get network configuration for the current environment
 */
export function getNetworkConfig(): NetworkConfig {
  const network = getCurrentNetwork();
  const config = NETWORK_CONFIGS[network];

  // Allow override of gateway URL via env variable
  const gatewayUrlOverride = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (gatewayUrlOverride) {
    return {
      ...config,
      gatewayUrl: gatewayUrlOverride,
    };
  }

  return config;
}

/**
 * Get the network ID (1 for mainnet, 2 for stokenet)
 */
export function getNetworkId(): number {
  return getNetworkConfig().networkId;
}

/**
 * Get the gateway URL
 */
export function getGatewayUrl(): string {
  return getNetworkConfig().gatewayUrl;
}

/**
 * Get the dashboard URL (for transaction explorer links)
 */
export function getDashboardUrl(): string {
  return getNetworkConfig().dashboardUrl;
}

/**
 * Get the dApp definition address from env
 * Works in both client-side (browser) and server-side (API routes) contexts
 * This is required for ROLA and should be different for mainnet vs stokenet
 */
export function getDappDefinitionAddress(): string {
  // Try client-side env var first (available in browser)
  let address = process.env.NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS;

  // Fall back to server-side env var (for API routes and radix.json)
  if (!address) {
    address = process.env.RADIX_BACKEND_ACCOUNT_ADDRESS;
  }

  if (!address) {
    throw new Error(
      'NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS is not set in environment variables. ' +
      'Set this to your backend account address.'
    );
  }

  const network = getCurrentNetwork();
  const expectedPrefix = network === 'mainnet' ? 'account_rdx' : 'account_tdx_2_';

  if (!address.startsWith(expectedPrefix)) {
    console.warn(
      `Warning: dApp definition address "${address}" doesn't match expected prefix for ${network} network (${expectedPrefix})`
    );
  }

  return address;
}
