"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { BrowserProvider } from "ethers";
import { createIDOSClient, type idOSClient as IdOSClientType } from "@idos-network/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Wallet, FileCheck, UserCheck, Loader2, X } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import Image from "next/image";
import { OneTimeDataRequestBuilder } from "@radixdlt/radix-dapp-toolkit";
import { useRadix } from "@/lib/hooks/useRadix";
import { useRadixAccounts } from "@/lib/hooks/useRadixAccounts";
import { getGatewayUrl, getDashboardUrl } from "@/lib/radix/network-config";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { rdt } = useRadix();
  const radixAccounts = useRadixAccounts();

  const [idOSClient, setIdOSClient] = useState<IdOSClientType | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [verifiedCredentials, setVerifiedCredentials] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [radixAccount, setRadixAccount] = useState<string | null>(null);
  const [radixVerifying, setRadixVerifying] = useState(false);
  const [radixWalletPending, setRadixWalletPending] = useState(false);
  const [radixPendingStartTime, setRadixPendingStartTime] = useState<number | null>(null);
  const [showFlashingInstall, setShowFlashingInstall] = useState(false);
  const [depositRuleChecking, setDepositRuleChecking] = useState(false);
  const [depositRuleAccepts, setDepositRuleAccepts] = useState<boolean | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintedTxId, setMintedTxId] = useState<string | null>(null);

  // Track pending time and show flashing install after 15 seconds
  useEffect(() => {
    if (radixWalletPending && radixPendingStartTime) {
      const timer = setTimeout(() => {
        setShowFlashingInstall(true);
      }, 15000);

      return () => clearTimeout(timer);
    } else {
      setShowFlashingInstall(false);
    }
  }, [radixWalletPending, radixPendingStartTime]);

  // Reset all state
  const resetState = () => {
    setIdOSClient(null);
    setHasProfile(null);
    setCredentials([]);
    setVerifiedCredentials(new Map());
    setLoading(false);
    setError("");
    setCurrentStep(1);
    setRadixAccount(null);
    setRadixVerifying(false);
    setRadixWalletPending(false);
    setMinting(false);
    setMintedTxId(null);
  };

  // Step 1: Connect wallet via WalletConnect modal
  const handleWalletClick = () => {
    open();
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    resetState();
  };

  // Step 2: Initialize idOS and check profile
  const initializeIdOS = async () => {
    if (!address || !isConnected) return;

    try {
      setLoading(true);
      setError("");

      // Create idOS client
      const clientConfig = createIDOSClient({
        nodeUrl: "https://nodes.idos.network",
        enclaveOptions: { container: "#idos-enclave" },
      });

      const client = await clientConfig.createClient();

      // Check if user has profile
      const profileExists = await client.addressHasProfile(address);
      setHasProfile(profileExists);

      if (!profileExists) {
        setError("No Proof-of-Personhood found. Please create a profile and verify at https://app.idos.network/?ref=2993D304");
        return;
      }

      // Get user's signer from connected wallet
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // Set signer and login
      const clientWithSigner = await client.withUserSigner(signer);
      const loggedInClient = await clientWithSigner.logIn();

      setIdOSClient(loggedInClient);
      setCurrentStep(2);

      // Fetch credentials and filter to only real credentials (not access grants)
      const allCredentials = await loggedInClient.getAllCredentials();
      const realCredentials = allCredentials.filter(
        (cred) => !cred.original_id && !!cred.public_notes
      );

      setCredentials(realCredentials);

      if (realCredentials.length === 0) {
        setError("No credentials found in your idOS profile (only access grants)");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize idOS");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify all credentials
  const verifyAllCredentials = async () => {
    if (!idOSClient || idOSClient.state !== "logged-in" || credentials.length === 0) return;

    try {
      setLoading(true);
      setError("");

      const consumerEncryptionPublicKey = process.env.NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY;
      const consumerAuthPublicKey = process.env.NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY;

      if (!consumerEncryptionPublicKey || !consumerAuthPublicKey) {
        setError("Consumer keys not configured");
        return;
      }

      const verified = new Map();

      for (const credential of credentials) {
        try {
          // Request access grant
          const accessGrant = await idOSClient.requestAccessGrant(credential.id, {
            consumerEncryptionPublicKey,
            consumerAuthPublicKey,
          });

          // Verify on backend - pass the credential ID so backend can find the grant
          const response = await fetch(
            `/api/verify-credential/${idOSClient.user.id}?dataId=${credential.id}`
          );
          const result = await response.json();

          if (result.error) {
            verified.set(credential.id, { success: false, error: result.error });
          } else {
            verified.set(credential.id, { success: true, data: result });
          }
        } catch (err: any) {
          verified.set(credential.id, { success: false, error: err.message });
        }
      }

      setVerifiedCredentials(verified);
      setCurrentStep(3);

      // If we have a verified Radix account, store credentials in server session
      if (radixAccount && idOSClient) {
        const successfulCredentials = credentials
          .filter(cred => verified.get(cred.id)?.success)
          .map(cred => ({
            credentialId: cred.id,
            issuerId: cred.issuer_auth_public_key,
          }));

        if (successfulCredentials.length > 0) {
          try {
            const response = await fetch('/api/radix/verify-credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                radixAddress: radixAccount,
                evmAddress: address,
                userId: idOSClient.user.id,
                credentials: successfulCredentials,
              }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
              console.error('[Frontend] Failed to store credentials:', result.error);
            }
          } catch (err) {
            console.error('[Frontend] Failed to store credentials:', err);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify credentials");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Check account deposit rule
  const checkAccountDepositRule = async (accountAddress: string) => {
    try {
      setDepositRuleChecking(true);

      const gatewayUrl = getGatewayUrl();

      const response = await fetch(`${gatewayUrl}/state/entity/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addresses: [accountAddress],
          aggregation_level: 'Vault',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch account details');
      }

      const data = await response.json();
      const accountData = data.items?.[0];

      if (!accountData?.details?.state) {
        // If there's no state field at all, deposits are accepted by default
        setDepositRuleAccepts(true);
        return;
      }

      const depositRule = accountData.details.state.default_deposit_rule;

      // Only "Accept" allows all deposits. "AllowExisting" and "Reject" both block new deposits
      if (!depositRule || depositRule === 'Accept') {
        setDepositRuleAccepts(true);
      } else {
        // "AllowExisting" or "Reject" - deposits are not fully enabled
        setDepositRuleAccepts(false);
      }
    } catch (err: any) {
      console.error('[Radix] Failed to check deposit rule:', err);
      // On error, assume it's okay to proceed
      setDepositRuleAccepts(true);
    } finally {
      setDepositRuleChecking(false);
    }
  };

  // Cancel Radix wallet connection request
  const cancelRadixConnection = () => {
    setRadixWalletPending(false);
    setRadixVerifying(false);
    setRadixPendingStartTime(null);
    setShowFlashingInstall(false);
    setError("");
  };

  // Step 4: Connect and verify Radix account with ROLA
  const connectRadixAccount = async () => {
    if (!rdt) {
      setError("Radix dApp Toolkit not initialized");
      return;
    }

    try {
      setRadixWalletPending(true);
      setRadixPendingStartTime(Date.now());
      setError("");

      // Request exactly 1 account with proof - wallet will provide its own challenge
      const response = await rdt.walletApi.sendOneTimeRequest(
        OneTimeDataRequestBuilder.accounts().exactly(1).withProof()
      );

      // Wallet responded, now verify with backend
      setRadixWalletPending(false);
      setRadixVerifying(true);

      if (!response) {
        throw new Error('No response from wallet');
      }

      if (response.isErr && response.isErr()) {
        console.error('[Radix] Wallet request returned error:', response.error);
        throw new Error(`Wallet error: ${JSON.stringify(response.error)}`);
      }

      // Extract accounts and proofs from response
      let accounts, proofs;
      if (response.isOk && response.isOk()) {
        accounts = response.value.accounts;
        proofs = response.value.proofs;
      } else {
        accounts = (response as any).accounts;
        proofs = (response as any).proofs;
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      if (!proofs || proofs.length === 0) {
        throw new Error('No proof provided by wallet');
      }

      // Use first account and its proof
      const account = accounts[0];
      const proof = proofs[0];
      const challenge = proof.challenge; // Challenge is provided by the wallet

      // Verify account ownership with ROLA on backend
      const verifyRes = await fetch("/api/radix/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge,
          proof: {
            publicKey: proof.proof.publicKey,
            signature: proof.proof.signature,
            curve: proof.proof.curve,
            address: account.address,
          },
        }),
      });

      const verifyResult = await verifyRes.json();

      if (!verifyResult.success) {
        throw new Error(verifyResult.error || "Failed to verify Radix account");
      }

      // If credentials were already verified, store them in session BEFORE setting radixAccount
      if (verifiedCredentials.size > 0 && idOSClient && idOSClient.state === 'logged-in') {
        const successfulCredentials = credentials
          .filter(cred => verifiedCredentials.get(cred.id)?.success)
          .map(cred => ({
            credentialId: cred.id,
            issuerId: cred.issuer_auth_public_key,
          }));

        if (successfulCredentials.length > 0) {
          try {
            const response = await fetch('/api/radix/verify-credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                radixAddress: account.address,
                evmAddress: address,
                userId: idOSClient.user.id,
                credentials: successfulCredentials,
              }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error(result.error || 'Failed to store credentials');
            }
          } catch (err: any) {
            console.error('[Radix] Failed to store credentials:', err);
            throw new Error('Failed to link credentials to Radix account: ' + err.message);
          }
        }
      }

      // Success! Account verified and credentials stored
      setRadixAccount(account.address);

      // Check account deposit rule
      await checkAccountDepositRule(account.address);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect Radix account");
      setRadixAccount(null);
    } finally {
      setRadixWalletPending(false);
      setRadixVerifying(false);
      setRadixPendingStartTime(null);
      setShowFlashingInstall(false);
    }
  };

  // Disconnect Radix wallet
  const disconnectRadixWallet = () => {
    setRadixAccount(null);
    setRadixVerifying(false);
    setRadixWalletPending(false);
    setMinting(false);
    setMintedTxId(null);
    // Note: We don't call rdt.disconnect() because that would disconnect
    // the entire wallet connection. We just clear our verification state.
  };

  // Step 5: Mint PoP NFT
  const mintPopNft = async () => {
    if (!radixAccount) {
      setError("Please connect and verify your Radix wallet first");
      return;
    }

    try {
      setMinting(true);
      setError("");

      // Call the mint API - backend will validate session
      const response = await fetch('/api/radix/mint-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radixAddress: radixAccount,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to mint NFT');
      }

      setMintedTxId(result.transactionId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to mint NFT');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] relative overflow-hidden">
      {/* Gradient Glow Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Top center glow (behind logos) - more prominent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#00ffb9] rounded-full opacity-[0.12] blur-[140px]" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Logo Section */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Image src="/idos-logo.png" alt="idOS" width={120} height={40} className="h-10 w-auto" />
            <X className="w-6 h-6 text-[#00ffb9]" />
            <Image src="/radix-logo.png" alt="Radix" width={120} height={40} className="h-10 w-auto" />
          </div>
          <p className="text-lg text-gray-300">
            Complete the Proof-of-Personhood process to receive your idOS Proof-of-Personhood NFT on Radix.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Step 1: Connect Wallet */}
          <Card className="bg-[#1a1a1a] border-[#00ffb9]/30 relative overflow-hidden transition-colors duration-300 group">
            {/* Card subtle glow - on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ffb9]/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isConnected && hasProfile && credentials.length > 0 ? "bg-[#00ffb9] shadow-[0_0_20px_rgba(0,255,185,0.4)]" : isConnected ? "bg-orange-500" : "bg-gray-700"
                }`}>
                  <Wallet className={`w-5 h-5 ${isConnected && hasProfile && credentials.length > 0 ? "text-black" : "text-white"}`} />
                </div>
                <div>
                  <CardTitle className="text-white">Step 1: Connect EVM Wallet</CardTitle>
                  <CardDescription className="text-gray-400">Connect an EVM compatible wallet</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <Button onClick={handleWalletClick} size="lg" className="w-full bg-[#00ffb9] hover:bg-[#00ffb9]/90 text-black font-semibold">
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#00ffb9]/10 border-2 border-[#00ffb9]/30 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-[#00ffb9] shrink-0" />
                      <span className="text-sm font-mono break-all text-[#00ffb9]">{address}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDisconnect} className="ml-2 shrink-0 border-gray-600 bg-transparent text-white hover:bg-[#00ffb9]/10 hover:border-[#00ffb9] hover:text-[#00ffb9]">
                      Disconnect
                    </Button>
                  </div>

                  {(hasProfile === null || hasProfile === false) && (
                    <Button onClick={initializeIdOS} disabled={loading} className="w-full bg-[#00ffb9] hover:bg-[#00ffb9]/90 text-black font-semibold">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Check idOS Profile
                    </Button>
                  )}

                  {/* Error Display for Step 1 */}
                  {error && hasProfile === false && (
                    <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg">
                      <div className="text-red-400">
                        {error.includes('https://') ? (
                          <>
                            {error.split('https://')[0]}
                            <a
                              href={`https://${error.split('https://')[1]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-red-300"
                            >
                              https://{error.split('https://')[1].split('?')[0]}
                            </a>
                          </>
                        ) : (
                          <p>{error}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Verify Credentials */}
          <Card className="bg-[#1a1a1a] border-[#00ffb9]/30 relative overflow-hidden transition-colors duration-300 group">
            {/* Card subtle glow - on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ffb9]/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    verifiedCredentials.size > 0 ? "bg-[#00ffb9] shadow-[0_0_20px_rgba(0,255,185,0.4)]" : currentStep >= 2 ? "bg-orange-500" : "bg-gray-700"
                  }`}>
                    <FileCheck className={`w-5 h-5 ${verifiedCredentials.size > 0 ? "text-black" : "text-white"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-white">Step 2: Verify Credentials</CardTitle>
                    <CardDescription className="text-gray-400">
                      {!isConnected
                        ? "Connect your wallet to continue"
                        : credentials.length > 0
                        ? `Found ${credentials.length} credential(s)`
                        : "Check your profile to see credentials"
                      }
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            {isConnected && (
              <CardContent className="space-y-4 relative z-10">
                {/* idOS Enclave Container - always present when connected */}
                <div className="p-4 border-2 border-dashed border-gray-700 rounded-lg bg-black/30">
                  <div className="text-center mb-3">
                    <p className="text-sm font-medium text-[#00ffb9]">
                      Secure idOS Enclave
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {hasProfile && credentials.length > 0
                        ? "Password prompt will appear here if needed"
                        : "Profile check or password prompt will appear here"
                      }
                    </p>
                  </div>
                  <div id="idos-enclave" className="[&_iframe]:!h-auto [&_iframe]:!min-h-0 [&_iframe]:!aspect-auto [&_iframe]:max-h-[120px] overflow-hidden"></div>
                </div>

                {hasProfile && credentials.map((cred) => {
                  let metadata: any = {};
                  try {
                    metadata = cred.public_notes ? JSON.parse(cred.public_notes) : {};
                  } catch (e) {
                    console.error('Failed to parse public_notes for', cred.id);
                  }

                  return (
                    <div key={cred.id} className="p-4 border border-gray-700 rounded-lg bg-black/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-white">
                              {metadata.type || "Unknown Type"}
                            </p>
                            {metadata.level && (
                              <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                                {metadata.level}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-mono mb-1">ID: {cred.id}</p>
                          <p className="text-xs text-gray-500">
                            Issuer: {cred.issuer_auth_public_key.substring(0, 20)}...
                          </p>
                        </div>
                        {verifiedCredentials.has(cred.id) && (
                          <Badge variant={verifiedCredentials.get(cred.id)?.success ? "success" : "destructive"} className={verifiedCredentials.get(cred.id)?.success ? "bg-[#00ffb9] text-black hover:bg-[#00ffb9]" : ""}>
                            {verifiedCredentials.get(cred.id)?.success ? "Verified" : "Failed"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {hasProfile && credentials.length > 0 && verifiedCredentials.size === 0 && (
                  <Button onClick={verifyAllCredentials} disabled={loading} size="lg" className="w-full bg-[#00ffb9] hover:bg-[#00ffb9]/90 text-black font-semibold">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify My Credentials
                  </Button>
                )}
              </CardContent>
            )}
          </Card>

          {/* Step 3: Claim Radix PoP NFT */}
          <Card className="bg-[#1a1a1a] border-[#00ffb9]/30 relative overflow-hidden transition-colors duration-300 group">
            {/* Card subtle glow - on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ffb9]/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  radixAccount ? "bg-[#00ffb9] shadow-[0_0_20px_rgba(0,255,185,0.4)]" : currentStep >= 3 ? "bg-orange-500" : "bg-gray-700"
                }`}>
                  <UserCheck className={`w-5 h-5 ${radixAccount ? "text-black" : "text-white"}`} />
                </div>
                <div>
                  <CardTitle className="text-white">Step 3: Claim Your PoP NFT</CardTitle>
                  <CardDescription className="text-gray-400">
                    {verifiedCredentials.size === 0
                      ? "Verify your credentials to continue"
                      : radixAccount
                      ? "Radix wallet connected successfully"
                      : "Connect Radix wallet to receive your Proof-of-Personhood NFT"
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {verifiedCredentials.size > 0 && (
              <CardContent className="relative z-10">
                {!radixAccount ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Button
                        onClick={radixWalletPending ? undefined : connectRadixAccount}
                        disabled={radixWalletPending || radixVerifying || !rdt}
                        size="lg"
                        className="w-full bg-[#00ffb9] hover:bg-[#00ffb9]/90 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {radixWalletPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Sign In Radix Wallet
                          </>
                        ) : radixVerifying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Verifying Account Ownership...
                          </>
                        ) : (
                          "Connect Radix Wallet"
                        )}
                      </Button>
                      {radixWalletPending && (
                        <button
                          onClick={cancelRadixConnection}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20 transition-colors z-10"
                          aria-label="Cancel request"
                        >
                          <X className="w-5 h-5 text-black" />
                        </button>
                      )}
                    </div>

                    {!radixWalletPending && !radixVerifying && (
                      <p className="text-center text-sm text-gray-400">
                        Click to connect your Radix wallet and verify ownership
                      </p>
                    )}

                    {radixWalletPending && (
                      <p className="text-center text-sm text-gray-400">
                        Check your Radix Wallet app to approve the request
                      </p>
                    )}

                    {/* Install Wallet Link - always visible when not connected */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <span>New to Radix?</span>
                        <a
                          href="https://wallet.radixdlt.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[#00ffb9] hover:text-[#00ffb9]/80 transition-all font-medium ${
                            showFlashingInstall ? 'animate-[glow_2s_ease-in-out_infinite]' : ''
                          }`}
                        >
                          Install Wallet
                        </a>
                      </div>
                      {showFlashingInstall && (
                        <p className="text-center text-xs text-gray-500">
                          After installing the extension, please reload this page
                        </p>
                      )}
                    </div>

                    {/* Error Display for Step 3 */}
                    {error && !radixAccount && (
                      <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg">
                        <div className="text-red-400">
                          {error.includes('https://') ? (
                            <>
                              {error.split('https://')[0]}
                              <a
                                href={`https://${error.split('https://')[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-red-300"
                              >
                                https://{error.split('https://')[1].split('?')[0]}
                              </a>
                            </>
                          ) : (
                            <p>{error}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#00ffb9]/10 border-2 border-[#00ffb9]/30 rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CheckCircle2 className="w-5 h-5 text-[#00ffb9] shrink-0" />
                        <span className="text-sm font-mono break-all text-[#00ffb9]">{radixAccount}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disconnectRadixWallet}
                        className="ml-2 shrink-0 border-gray-600 bg-transparent text-white hover:bg-[#00ffb9]/10 hover:border-[#00ffb9] hover:text-[#00ffb9]"
                      >
                        Disconnect
                      </Button>
                    </div>

                    {/* Deposit Rule Warning */}
                    {!mintedTxId && depositRuleAccepts === false && (
                      <div className="flex items-center justify-between p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <X className="w-5 h-5 text-orange-500 shrink-0" />
                          <span className="text-sm text-orange-400">
                            <span className="font-semibold">Deposits Disabled:</span> Your Radix account has third-party deposits disabled. Please enable deposits in your Radix Wallet app.
                          </span>
                        </div>
                        <Button
                          onClick={() => radixAccount && checkAccountDepositRule(radixAccount)}
                          disabled={depositRuleChecking}
                          size="sm"
                          className="ml-2 shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                        >
                          {depositRuleChecking ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Checking...
                            </>
                          ) : (
                            "Check Again"
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Only show verification complete section if deposits are enabled or NFT is minted */}
                    {(depositRuleAccepts !== false || mintedTxId) && (
                      <div className="text-center p-8 bg-black/30 border border-gray-700 rounded-lg">
                      <UserCheck className="w-16 h-16 mx-auto mb-4 text-[#00ffb9]" />
                      <h3 className="text-xl font-bold mb-2 text-white">
                        {mintedTxId ? "NFT Minted Successfully!" : "Verification Complete!"}
                      </h3>
                      <p className="text-gray-400 mb-4">
                        {mintedTxId
                          ? "Your Proof-of-Personhood NFT has been sent to your Radix wallet."
                          : "Your Radix account has been verified with ROLA. You can now receive your Proof-of-Personhood NFT."
                        }
                      </p>

                      {!mintedTxId ? (
                        <Button
                          onClick={mintPopNft}
                          disabled={minting || depositRuleChecking || depositRuleAccepts === false}
                          size="lg"
                          className="bg-[#00ffb9] hover:bg-[#00ffb9]/90 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {minting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Minting NFT...
                            </>
                          ) : depositRuleChecking ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Checking Account...
                            </>
                          ) : (
                            "Send NFT"
                          )}
                        </Button>
                      ) : (
                        <div className="p-3 bg-[#00ffb9]/10 border border-[#00ffb9]/30 rounded">
                          <p className="text-xs text-gray-400 mb-1">Transaction ID:</p>
                          <a
                            href={`${getDashboardUrl()}/transaction/${mintedTxId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-[#00ffb9] break-all hover:text-[#00ffb9]/80 transition-colors underline"
                          >
                            {mintedTxId}
                          </a>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Error Display - Only show here if not related to profile check */}
          {error && hasProfile !== false && (
            <Card className="bg-[#1a1a1a] border-red-500/50">
              <CardContent className="pt-6">
                <div className="text-red-400">
                  {error.includes('https://') ? (
                    <>
                      {error.split('https://')[0]}
                      <a
                        href={`https://${error.split('https://')[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-red-300"
                      >
                        https://{error.split('https://')[1]}
                      </a>
                    </>
                  ) : (
                    <p>{error}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
