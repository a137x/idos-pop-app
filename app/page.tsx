"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { BrowserProvider } from "ethers";
import { createIDOSClient, type idOSClient as IdOSClientType } from "@idos-network/client";
import { useAppKit } from "@reown/appkit/react";
import { OneTimeDataRequestBuilder } from "@radixdlt/radix-dapp-toolkit";
import { useRadix } from "@/lib/hooks/useRadix";
import { useRadixAccounts } from "@/lib/hooks/useRadixAccounts";
import { getGatewayUrl, getDashboardUrl, getDappDefinitionAddress } from "@/lib/radix/network-config";
import { setNextRolaChallenge } from "@/lib/providers/radixProvider";
import { getDerivationChallenge, deriveIdosSigner } from "@/lib/radix/idos-signer";
import type { Wallet as EthersWallet } from "ethers";

// External-link arrow, mirrors the beacon/landing footer glyph
function Ext() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 9.5 L9 3 M4 3 H9 V8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Error text with clickable URLs (idOS onboarding links etc.)
function ErrorText({ text }: { text: string }) {
  if (!text.includes("https://")) return <p>{text}</p>;
  const pre = text.split("https://")[0];
  const rest = text.split("https://")[1];
  return (
    <p>
      {pre}
      <a href={`https://${rest}`} target="_blank" rel="noopener noreferrer">
        {`https://${rest.split("?")[0]}`}
      </a>
    </p>
  );
}

// Helper function to add context to error messages
const enhanceErrorMessage = (err: any, context: string): string => {
  const originalMessage = err.message || err.toString();

  // Check for array access errors (different browsers phrase it differently)
  // Chrome/Firefox: "Cannot read properties of undefined (reading '0')"
  // Safari/iOS: "undefined is not an object (evaluating 'e[0]')"
  const isArrayAccessError = originalMessage.includes("reading '0'") ||
                             (originalMessage.includes("evaluating") && originalMessage.includes("[0]"));

  if (isArrayAccessError) {
    console.error("========================================");
    console.error("DETECTED: UNDEFINED ARRAY ACCESS ERROR");
    console.error("Context:", context);
    console.error("Error message:", originalMessage);
    console.error("Error object:", err);
    console.error("Error stack:", err.stack);
    console.error("========================================");
    return `[${context}] ${originalMessage}`;
  }

  return originalMessage;
};

// Expected user-flow outcomes (cancelled wallet request, legacy secp256k1
// account) are explained in the UI — keep them out of console.error so the
// console only turns red on real failures.
const isUserCancel = (err: unknown): boolean =>
  String((err as any)?.message ?? err).includes("rejectedByUser");
const isExpectedFlowError = (err: unknown): boolean =>
  isUserCancel(err) || String((err as any)?.message ?? err).includes("legacy secp256k1");

export default function Home() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
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
  const [radixAccountChecked, setRadixAccountChecked] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>("");
  // Radix→idOS login bridge (see lib/radix/idos-signer.ts)
  const [derivedSigner, setDerivedSigner] = useState<EthersWallet | null>(null);
  const [radixLogin, setRadixLogin] = useState<
    "idle" | "signing" | "logging-in" | "no-profile" | "linking" | "done"
  >("idle");
  const [showEvmLogin, setShowEvmLogin] = useState(false);
  // Which register panel is open. Follows the flow automatically; the user
  // can flip back to any already-unlocked step.
  const [viewStep, setViewStep] = useState(1);
  // Optional return link (?back=…) — set by whichever dApp sent the user here
  // (e.g. the OTER oracle) so they can hop back after the badge is issued.
  const [backUrl, setBackUrl] = useState<string | null>(null);
  // Set when this person (idOS userId / credential) already claimed a badge —
  // detected proactively at login (claims DB) or at mint time (DB or ledger).
  const [existingClaim, setExistingClaim] = useState<{
    credentialId: string;
    radixAddress?: string;
    claimedAt?: string;
  } | null>(null);

  useEffect(() => {
    setViewStep(currentStep);
  }, [currentStep]);

  useEffect(() => {
    const back = new URLSearchParams(window.location.search).get("back");
    if (back && /^https?:\/\//.test(back)) setBackUrl(back);
  }, []);

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
    setRadixAccountChecked(false);
    setDerivedSigner(null);
    setRadixLogin("idle");
    setShowEvmLogin(false);
    setExistingClaim(null);
  };

  // Step 2: Connect EVM wallet via WalletConnect modal
  const handleWalletClick = () => {
    open();
  };

  // Handle EVM wallet disconnect
  const handleDisconnect = () => {
    disconnect();
    // Reset all state except Radix connection
    setIdOSClient(null);
    setHasProfile(null);
    setCredentials([]);
    setVerifiedCredentials(new Map());
    setLoading(false);
    setError("");
    setCurrentStep(radixAccount ? 2 : 1);
    setMinting(false);
    setMintedTxId(null);
    setDerivedSigner(null);
    setRadixLogin("idle");
    setExistingClaim(null);
  };

  // Shared login completion: store the logged-in client and load the user's
  // PoP credentials. Used by both the Radix-native and EVM login paths.
  const finishIdosLogin = async (
    loggedInClient: Extract<IdOSClientType, { state: "logged-in" }>
  ) => {
    setIdOSClient(loggedInClient);
    setCurrentStep(3);

    // Fetch credentials and filter to only PoP credentials (FaceSign)
    let allCredentials;
    try {
      allCredentials = await loggedInClient.getAllCredentials();
    } catch (sdkError: any) {
      // Capture diagnostic info for idOS SDK error
      const diagnostic = `
idOS SDK Error Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location: idOS Login
Method: loggedInClient.getAllCredentials()
Parameters: (none)
Client State: ${loggedInClient.state}
User ID: ${loggedInClient.user?.id || 'N/A'}

Error Message: ${sdkError.message}

Stack Trace:
${sdkError.stack || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This appears to be an idOS SDK internal error.
      `.trim();

      setDiagnosticInfo(diagnostic);
      console.error("[idOS SDK Error]", diagnostic);
      throw new Error(`idOS SDK getAllCredentials() failed: ${sdkError.message}`);
    }

    // Validate the return value
    if (!allCredentials || !Array.isArray(allCredentials)) {
      const diagnostic = `
Data Validation Error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location: idOS Login
Method: loggedInClient.getAllCredentials()
Expected: Array of credentials
Received: ${typeof allCredentials}
Value: ${JSON.stringify(allCredentials, null, 2)}

Client State: ${loggedInClient.state}
User ID: ${loggedInClient.user?.id || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The SDK returned successfully but with unexpected data format.
      `.trim();

      setDiagnosticInfo(diagnostic);
      console.error("[Data Validation Error]", diagnostic);
      setError("Failed to fetch credentials. Please try again.");
      return;
    }

    const realCredentials = allCredentials.filter(
      (cred) => !cred.original_id && !!cred.public_notes
    );

    // Filter to only PoP credentials (FaceSign issuer) and take the first one
    const popCredentials = realCredentials.filter((cred) => {
      try {
        if (!cred.public_notes) return false;
        const notes = JSON.parse(cred.public_notes);
        return notes.issuer === "FaceSign";
      } catch {
        return false;
      }
    });

    console.log(`Found ${popCredentials.length} PoP credential(s) out of ${realCredentials.length} total credentials`);

    // Only use the first PoP credential (users should only have one, but don't error if they have multiple)
    const firstPopCredential = popCredentials.length > 0 ? [popCredentials[0]] : [];

    setCredentials(firstPopCredential);

    if (firstPopCredential.length === 0) {
      setError("No Proof-of-Personhood credentials found. Please create a FaceSign credential at https://app.idos.network");
    }

    // Proactive dedup check: has this person already claimed a badge?
    // (One human, one badge — surface it up front, not at mint time.)
    try {
      const checkRes = await fetch("/api/claim/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedInClient.user.id }),
      });
      const check = await checkRes.json();
      if (check?.claimed && check.claim) {
        setExistingClaim({
          credentialId: check.claim.credentialId,
          radixAddress: check.claim.radixAddress,
          claimedAt: check.claim.claimedAt,
        });
        setCurrentStep(4);
      }
    } catch (err) {
      console.error("[Claim check] failed (non-fatal):", err);
    }
  };

  // Step 3: Initialize idOS and check profile
  const initializeIdOS = async () => {
    if (!address || !isConnected) {
      setError("Please connect your EVM wallet first.");
      return;
    }

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
        setError("No Proof-of-Personhood found. Please create a profile and verify at https://app.idos.network");
        return;
      }

      // Get user's signer from connected wallet
      if (!walletClient) {
        setError("Wallet client not available. Please reconnect your wallet.");
        return;
      }

      // Use walletClient's transport as the provider
      const { account, chain, transport } = walletClient;
      const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
      };
      const provider = new BrowserProvider(transport, network);
      const signer = await provider.getSigner(account.address);

      // Set signer and login
      const clientWithSigner = await client.withUserSigner(signer);
      const loggedInClient = await clientWithSigner.logIn();

      await finishIdosLogin(loggedInClient);
    } catch (err: any) {
      const errorMessage = enhanceErrorMessage(err, "Step 2: Initialize idOS");
      setError(errorMessage || "Failed to initialize idOS");
      console.error("[Step 2: Initialize idOS]", err);
    } finally {
      setLoading(false);
    }
  };

  // Radix-native idOS login: derive a deterministic EVM signer from a ROLA
  // signature over a fixed challenge (see lib/radix/idos-signer.ts) and log
  // in to idOS with it. No EVM wallet involved.
  const loginWithRadixIdos = async () => {
    if (!rdt) {
      setError("Radix dApp Toolkit not initialized");
      return;
    }
    if (!radixAccount) {
      setError("Please connect your Radix account first.");
      return;
    }

    try {
      setRadixLogin("signing");
      setError("");

      // The wallet must sign the FIXED derivation challenge, not a backend one
      const challenge = await getDerivationChallenge();
      setNextRolaChallenge(challenge);

      const response = await rdt.walletApi.sendOneTimeRequest(
        OneTimeDataRequestBuilder.accounts().exactly(1).withProof()
      );

      if (!response) throw new Error("No response from wallet");
      if (response.isErr && response.isErr()) {
        throw new Error(`Wallet error: ${JSON.stringify(response.error)}`);
      }

      let accounts, proofs;
      if (response.isOk && response.isOk()) {
        accounts = response.value.accounts;
        proofs = response.value.proofs;
      } else {
        accounts = (response as any).accounts;
        proofs = (response as any).proofs;
      }

      const account = accounts?.[0];
      const proof = proofs?.[0];
      if (!account || !proof) throw new Error("Wallet returned no account proof");
      if (proof.challenge !== challenge) {
        throw new Error("Wallet signed an unexpected challenge — please try again.");
      }
      if (account.address !== radixAccount) {
        throw new Error(
          `Please sign with the same Radix account you connected in Step 1 (${radixAccount}). ` +
            "Your idOS login key is derived from that account's signature."
        );
      }

      setRadixLogin("logging-in");

      // The signature is the master secret for the derived key — it stays in
      // this browser tab and is never sent anywhere.
      const signer = await deriveIdosSigner({
        signatureHex: proof.proof.signature,
        curve: proof.proof.curve,
        radixAddress: account.address,
        dappDefinitionAddress: getDappDefinitionAddress(),
        origin: window.location.origin,
      });
      setDerivedSigner(signer);

      const clientConfig = createIDOSClient({
        nodeUrl: "https://nodes.idos.network",
        enclaveOptions: { container: "#idos-enclave" },
      });
      const client = await clientConfig.createClient();

      const profileExists = await client.addressHasProfile(signer.address);
      setHasProfile(profileExists);

      if (!profileExists) {
        // Not linked yet: either an existing profile needs a one-time EVM
        // login to link this key, or the user is new to idOS entirely.
        setRadixLogin("no-profile");
        return;
      }

      const clientWithSigner = await client.withUserSigner(signer);
      const loggedInClient = await clientWithSigner.logIn();
      await finishIdosLogin(loggedInClient);
      setRadixLogin("done");
    } catch (err: any) {
      setRadixLogin("idle");
      if (isExpectedFlowError(err)) {
        console.info("[Step 2: Radix idOS Login]", String(err?.message ?? err));
        setError(
          isUserCancel(err)
            ? "Wallet request cancelled — try again when ready."
            : err?.message ?? "Radix idOS login failed"
        );
      } else {
        const errorMessage = enhanceErrorMessage(err, "Step 2: Radix idOS Login");
        console.error("[Step 2: Radix idOS Login]", err);
        setError(errorMessage || "Radix idOS login failed");
      }
    }
  };

  // One-time migration: attach the Radix-derived key to an existing idOS
  // profile (requires being logged in with the profile's current EVM wallet),
  // then re-log-in with the derived key to prove the link works end-to-end.
  const linkRadixWallet = async () => {
    if (!idOSClient || idOSClient.state !== "logged-in") {
      setError("Log in with your EVM wallet below first, then link your Radix wallet.");
      return;
    }
    if (!derivedSigner) {
      setError("Sign in with your Radix wallet first so the login key can be derived.");
      return;
    }

    try {
      setRadixLogin("linking");
      setError("");

      // Ownership proof for the new wallet, signed by the derived key itself
      const message = `Add wallet ${derivedSigner.address} to my idOS profile (Radix login bridge, ${window.location.origin})`;
      const signature = await derivedSigner.signMessage(message);

      await idOSClient.addWallet({
        id: crypto.randomUUID(),
        address: derivedSigner.address,
        public_key: derivedSigner.signingKey.publicKey,
        message,
        signature,
        wallet_type: "evm",
      });

      // Switch the session to the derived key (reuses the same enclave)
      const idleClient = await idOSClient.logOut();
      const clientWithSigner = await idleClient.withUserSigner(derivedSigner);
      const loggedInClient = await clientWithSigner.logIn();
      await finishIdosLogin(loggedInClient);
      setHasProfile(true);
      setRadixLogin("done");
    } catch (err: any) {
      setRadixLogin("no-profile");
      const errorMessage = enhanceErrorMessage(err, "Link Radix Wallet");
      console.error("[Link Radix Wallet]", err);
      setError(errorMessage || "Failed to link Radix wallet to your idOS profile");
    }
  };

  // Step 4: Verify first PoP credential only
  const verifyAllCredentials = async () => {
    if (!idOSClient) {
      setError("idOS client not initialized. Please reconnect your wallet and check your profile again.");
      return;
    }

    if (idOSClient.state !== "logged-in") {
      setError("Not logged in to idOS. Please check your profile again.");
      return;
    }

    if (!credentials || credentials.length === 0) {
      setError("No credentials found. Please check your idOS profile again.");
      return;
    }

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

      // Only verify the first PoP credential
      const firstCredential = credentials[0];

      try {
        console.log("Requesting access grant for first PoP credential:", firstCredential.id);

        // Request access grant for first credential only
        const accessGrant = await idOSClient.requestAccessGrant(firstCredential.id, {
          consumerEncryptionPublicKey,
          consumerAuthPublicKey,
        });

        // Verify on backend - pass the credential ID so backend can find the grant
        const response = await fetch(
          `/api/verify-credential/${idOSClient.user.id}?dataId=${firstCredential.id}`
        );
        const result = await response.json();

        if (result.error) {
          // Check if it's an array access error from backend (different browsers phrase it differently)
          const isArrayAccessError = result.error.includes("reading '0'") ||
                                     (result.error.includes("evaluating") && result.error.includes("[0]"));

          if (isArrayAccessError) {
            const diagnostic = `
Backend API Error Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location: Step 3 - Verify Credential
API Endpoint: /api/verify-credential/${idOSClient.user.id}
Parameters:
  - userId: ${idOSClient.user.id}
  - dataId: ${firstCredential.id}

Error Message: ${result.error}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This appears to be an error in the backend API, likely in the idOS Consumer SDK.
            `.trim();

            setDiagnosticInfo(diagnostic);
            console.error("[Backend API Error]", diagnostic);
          }
          verified.set(firstCredential.id, { success: false, error: result.error });
        } else {
          verified.set(firstCredential.id, { success: true, data: result });
        }
      } catch (err: any) {
        const errorMessage = enhanceErrorMessage(err, "Step 3: Verify Credential");
        verified.set(firstCredential.id, { success: false, error: errorMessage });
        console.error("[Step 3: Verify Credential]", err);
      }

      setVerifiedCredentials(verified);
      setCurrentStep(4);

      // If we have a verified Radix account, store first verified credential in server session
      if (radixAccount && idOSClient) {
        const successfulCredentials = verified.get(firstCredential.id)?.success
          ? [{
              credentialId: firstCredential.id,
              issuerId: firstCredential.issuer_auth_public_key,
            }]
          : [];

        if (successfulCredentials.length > 0) {
          try {
            const response = await fetch('/api/radix/verify-credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                radixAddress: radixAccount,
                // Derived EVM address when logged in via the Radix bridge
                evmAddress: address ?? idOSClient.walletIdentifier,
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
      const errorMessage = enhanceErrorMessage(err, "Step 3: Verify All Credentials");
      setError(errorMessage || "Failed to verify credentials");
      console.error("[Step 3: Verify All Credentials]", err);
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
      const accountData = data?.items?.[0];

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
      console.error('[Step 1: Check Deposit Rule]', err);
      if (err.message?.includes("reading '0'")) {
        console.error('[Step 1: Check Deposit Rule] Detected undefined array access error');
      }
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

  // Step 1: Connect and verify Radix account with ROLA
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
        const walletErr = JSON.stringify(response.error);
        if (walletErr.includes('rejectedByUser')) {
          console.info('[Radix] Wallet request cancelled in the wallet');
        } else {
          console.error('[Radix] Wallet request returned error:', response.error);
        }
        throw new Error(`Wallet error: ${walletErr}`);
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
                // In Radix-native login there is no connected EVM wallet;
                // the idOS wallet identifier is the derived EVM address.
                evmAddress: address ?? idOSClient.walletIdentifier,
                userId: idOSClient.user.id,
                credentials: successfulCredentials,
              }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error(result.error || 'Failed to store credentials');
            }
          } catch (err: any) {
            const errorMessage = enhanceErrorMessage(err, "Step 1: Store Credentials");
            console.error('[Step 1: Store Credentials]', err);
            throw new Error('Failed to link credentials to Radix account: ' + errorMessage);
          }
        }
      }

      // Success! Account verified and credentials stored
      setRadixAccount(account.address);
      setRadixAccountChecked(true);

      // Move to step 2 after Radix wallet is connected
      setCurrentStep(2);

      // Check account deposit rule
      await checkAccountDepositRule(account.address);
    } catch (err: any) {
      if (isUserCancel(err)) {
        console.info("[Step 1: Connect Radix Account] cancelled in the wallet");
        setError("Wallet request cancelled — click Connect Radix wallet to try again.");
      } else {
        const errorMessage = enhanceErrorMessage(err, "Step 1: Connect Radix Account");
        console.error("[Step 1: Connect Radix Account]", err);
        setError(errorMessage || "Failed to connect Radix account");
      }
      setRadixAccount(null);
    } finally {
      setRadixWalletPending(false);
      setRadixVerifying(false);
      setRadixPendingStartTime(null);
      setShowFlashingInstall(false);
    }
  };

  // Disconnect Radix wallet - resets to step 1
  const disconnectRadixWallet = () => {
    setRadixAccount(null);
    setRadixVerifying(false);
    setRadixWalletPending(false);
    setMinting(false);
    setMintedTxId(null);
    setRadixAccountChecked(false);
    // Also reset EVM wallet and credentials since they depend on Radix
    disconnect();
    setIdOSClient(null);
    setHasProfile(null);
    setCredentials([]);
    setVerifiedCredentials(new Map());
    setCurrentStep(1);
    setDerivedSigner(null);
    setRadixLogin("idle");
    setShowEvmLogin(false);
    setExistingClaim(null);
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
        // Person/credential already holds a badge (claims DB or on-ledger
        // NFT-id dedup) — expected protocol outcome, not an error.
        if (response.status === 409 && result.alreadyClaimed) {
          setExistingClaim({
            credentialId: result.nftId,
            radixAddress: result.radixAddress,
            claimedAt: result.claimedAt,
          });
          return;
        }
        throw new Error(result.error || 'Failed to mint NFT');
      }

      setMintedTxId(result.transactionId);
    } catch (err: any) {
      const errorMessage = enhanceErrorMessage(err, "Step 4: Mint NFT");
      console.error("[Step 4: Mint NFT]", err);
      setError(errorMessage || 'Failed to mint NFT');
    } finally {
      setMinting(false);
    }
  };

  // ——— The register: four steps as a horizontal accordion ———
  const SPINES = ["Connect Radix", "Log in to idOS", "Verify credential", "Claim PoP NFT"];
  const stepDone = [
    !!radixAccount,
    !!idOSClient,
    verifiedCredentials.size > 0 || !!existingClaim,
    !!mintedTxId || !!existingClaim,
  ];
  const stepUnlocked = [
    true,
    !!radixAccount,
    !!idOSClient,
    (verifiedCredentials.size > 0 && !!radixAccount) || !!existingClaim,
  ];

  const panelBodies = [
    // ——— Step 1: Connect Radix account ———
    !radixAccount ? (
      <>
        <h2>Connect your Radix account</h2>
        <p className="desc">
          Your wallet signs a one-time ownership proof (ROLA). The PoP badge will be
          issued to this account.
        </p>
        <div className="btnrow">
          <button
            className="btn w100"
            onClick={radixWalletPending ? undefined : connectRadixAccount}
            disabled={radixWalletPending || radixVerifying || !rdt}
          >
            {radixWalletPending
              ? "Approve in your Radix wallet…"
              : radixVerifying
              ? "Verifying ownership…"
              : "Connect Radix wallet"}
          </button>
          {radixWalletPending && (
            <button className="btn ghost" onClick={cancelRadixConnection}>
              Cancel
            </button>
          )}
        </div>
        <p className="hint">
          New to Radix?{" "}
          <a
            className={showFlashingInstall ? "attn" : ""}
            href="https://wallet.radixdlt.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install the Radix wallet ↗
          </a>
          {showFlashingInstall && <> — after installing, reload this page</>}
        </p>
        {error && currentStep === 1 && (
          <div className="errbox">
            <ErrorText text={error} />
          </div>
        )}
      </>
    ) : (
      <>
        <h2>Account connected</h2>
        <div className="okbox">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label">Account · ownership verified</div>
            <div className="val">{radixAccount}</div>
          </div>
          <button className="btn ghost sm" onClick={disconnectRadixWallet}>
            Disconnect
          </button>
        </div>
        <p className="hint">Wrong account? Disconnect and start over — the flow restarts from here.</p>
      </>
    ),

    // ——— Step 2: Log in to idOS ———
    <>
      {idOSClient ? (
        <>
          <h2>Logged in to idOS</h2>
          <div className="okbox">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label">
                {derivedSigner && radixLogin === "done"
                  ? "idOS login · via Radix wallet"
                  : "idOS login · via EVM wallet"}
              </div>
              {isConnected && address && <div className="val">{address}</div>}
            </div>
            {isConnected && (
              <button className="btn ghost sm" onClick={handleDisconnect}>
                Disconnect
              </button>
            )}
          </div>
          {derivedSigner && (radixLogin === "no-profile" || radixLogin === "linking") && (
            <div className="notebox">
              <p>
                Enable Radix-only login for this idOS profile. After linking, you
                won&apos;t need an EVM wallet on this site again.
              </p>
              <button
                className="btn w100"
                onClick={linkRadixWallet}
                disabled={radixLogin === "linking"}
              >
                {radixLogin === "linking"
                  ? "Linking Radix login…"
                  : "Link Radix login to this profile"}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <h2>Log in to idOS</h2>
          <p className="desc">Sign once with your Radix wallet — no EVM wallet needed.</p>
          <button
            className="btn w100"
            onClick={loginWithRadixIdos}
            disabled={radixLogin === "signing" || radixLogin === "logging-in"}
          >
            {radixLogin === "signing"
              ? "Approve in your Radix wallet…"
              : radixLogin === "logging-in"
              ? "Deriving key & logging in…"
              : "Log in with Radix wallet"}
          </button>
          {radixLogin !== "no-profile" && (
            <p className="hint">
              Your Radix signature deterministically derives your idOS login key — it
              never leaves this browser.
            </p>
          )}
          {radixLogin === "no-profile" && (
            <div className="notebox">
              <p>
                <b>No idOS profile is linked to your Radix wallet yet.</b>
              </p>
              <p>
                <b>Have an idOS profile?</b> Log in with the EVM wallet it was created
                with (below), then link your Radix wallet — one time only.
              </p>
              <p>
                <b>New to idOS?</b> Create a profile and FaceSign credential at{" "}
                <a href="https://app.idos.network" target="_blank" rel="noopener noreferrer">
                  app.idos.network
                </a>
                , then come back here.
              </p>
            </div>
          )}
          {showEvmLogin || radixLogin === "no-profile" ? (
            <div
              style={{
                borderTop: "1px solid var(--beige)",
                paddingTop: 14,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {!isConnected ? (
                <button className="btn ghost w100" onClick={handleWalletClick}>
                  Connect EVM wallet
                </button>
              ) : (
                <>
                  <div className="okbox">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="label">EVM wallet</div>
                      <div className="val">{address}</div>
                    </div>
                    <button className="btn ghost sm" onClick={handleDisconnect}>
                      Disconnect
                    </button>
                  </div>
                  <button
                    className="btn w100"
                    onClick={initializeIdOS}
                    disabled={loading || !walletClient}
                  >
                    {loading
                      ? "Checking profile…"
                      : !walletClient
                      ? "Loading wallet…"
                      : "Log in with EVM wallet"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="hint">
              <button className="linklike" onClick={() => setShowEvmLogin(true)}>
                Use an EVM wallet instead
              </button>
            </p>
          )}
        </>
      )}
      {error && !idOSClient && (
        <div className="errbox">
          <ErrorText text={error} />
        </div>
      )}
    </>,

    // ——— Step 3: Verify PoP credential ———
    <>
      <h2>Verify your PoP credential</h2>
      <p className="desc">
        {credentials.length > 0
          ? `Found ${credentials.length} PoP credential(s). Grant one-time read access so the issuer can verify it.`
          : "Checking your idOS profile for FaceSign credentials…"}
      </p>
      {hasProfile &&
        credentials.map((cred) => {
          let metadata: any = {};
          try {
            metadata = cred.public_notes ? JSON.parse(cred.public_notes) : {};
          } catch (e) {
            console.error("Failed to parse public_notes for", cred.id);
          }
          const verdict = verifiedCredentials.get(cred.id);

          return (
            <div key={cred.id} className="cred">
              <div className="cred-head">
                <div className="cred-type">
                  {metadata.type || "Unknown type"}
                  {metadata.level && <span className="chip">{metadata.level}</span>}
                </div>
                {verifiedCredentials.has(cred.id) && (
                  <span className={`chip ${verdict?.success ? "ok" : "bad"}`}>
                    {verdict?.success ? "Verified" : "Failed"}
                  </span>
                )}
              </div>
              <div className="kv">ID: {cred.id}</div>
              <div className="kv">Issuer: {cred.issuer_auth_public_key.substring(0, 20)}…</div>
              {verifiedCredentials.has(cred.id) && !verdict?.success && (
                <div className="errbox" style={{ marginTop: 8 }}>
                  <p>Error: {verdict?.error || "Unknown error"}</p>
                </div>
              )}
            </div>
          );
        })}
      {hasProfile && credentials.length > 0 && verifiedCredentials.size === 0 && (
        <button className="btn w100" onClick={verifyAllCredentials} disabled={loading}>
          {loading ? "Requesting access grant…" : "Verify PoP credential"}
        </button>
      )}
    </>,

    // ——— Step 4: Claim the PoP NFT ———
    <>
      <h2>
        {mintedTxId
          ? "Badge issued"
          : existingClaim
          ? "Badge already issued"
          : "Claim your PoP NFT"}
      </h2>
      {existingClaim && !mintedTxId && (
        <>
          <div className="infobox">
            <p style={{ margin: 0 }}>
              <b>This personhood already holds a PoP badge.</b> One human, one badge —
              a second one can&apos;t be issued, on purpose.
            </p>
          </div>
          <div className="cred">
            <div className="kv">Badge ID: {existingClaim.credentialId}</div>
            <div className="kv">
              Issued to:{" "}
              {existingClaim.radixAddress || "another Radix account (on-ledger record)"}
            </div>
            {existingClaim.claimedAt && (
              <div className="kv">Issued at: {existingClaim.claimedAt}</div>
            )}
          </div>
          <p className="hint">
            To use your badge in a dApp, connect the Radix account that holds it.
            The badge is soulbound — it can&apos;t be moved between accounts.
          </p>
        </>
      )}
      {!existingClaim && !mintedTxId && depositRuleAccepts === false && (
        <div className="errbox">
          <p>
            <b>Deposits disabled.</b> Your Radix account blocks third-party deposits.
            Enable deposits in the Radix wallet app, then check again.
          </p>
          <div style={{ marginTop: 10 }}>
            <button
              className="btn sm"
              onClick={() => radixAccount && checkAccountDepositRule(radixAccount)}
              disabled={depositRuleChecking}
            >
              {depositRuleChecking ? "Checking…" : "Check again"}
            </button>
          </div>
        </div>
      )}
      {!existingClaim && (depositRuleAccepts !== false || mintedTxId) && (
        <div className="claim">
          <h3>{mintedTxId ? "Personhood on record" : "Ready to claim"}</h3>
          <p>
            {mintedTxId
              ? "Your Proof-of-Personhood NFT is in your Radix account. It is soulbound — it can't be transferred, only proven."
              : "All checks passed. The issuer will mint your Proof-of-Personhood NFT and send it to your connected account."}
          </p>
          {!mintedTxId ? (
            <button
              className="btn"
              onClick={mintPopNft}
              disabled={minting || depositRuleChecking || depositRuleAccepts === false}
            >
              {minting
                ? "Minting NFT…"
                : depositRuleChecking
                ? "Checking account…"
                : "Mint & send my NFT"}
            </button>
          ) : (
            <>
              <div className="txbox">
                <div className="label">Transaction</div>
                <a
                  href={`${getDashboardUrl()}/transaction/${mintedTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {mintedTxId}
                </a>
              </div>
              {backUrl && (
                <p style={{ marginTop: 14, marginBottom: 0 }}>
                  <a className="btn" href={backUrl}>
                    Return to the app →
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>,
  ];

  return (
    <>
      <header className="hdr" id="top">
        <div className="wrap hbar">
          <div className="brand">
            <span className="logomark" aria-hidden="true">
              <i></i>
              <i className="g"></i>
              <i></i>
              <i></i>
            </span>
            <h1>OTER</h1>
            <span className="sub">Proof of Personhood</span>
          </div>
          <nav>
            <a href="https://app.idos.network" target="_blank" rel="noopener noreferrer">
              idOS
            </a>
            <a href="https://oter.io">oter.io</a>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <section className="intro">
          <p className="tag">
            Verify your personhood once with idOS FaceSign and receive a soulbound
            Proof-of-Personhood NFT on Radix — a badge any dApp can gate on, starting
            with the OTER oracle. One human, one badge.
          </p>

          <p className="sh" aria-live="polite">
            <span className="dot" aria-hidden="true"></span>
            {mintedTxId
              ? "Complete · badge issued"
              : existingClaim
              ? "Complete · badge already issued"
              : `Step ${currentStep} of 4 · ${SPINES[currentStep - 1]}`}
          </p>

          <div className="acc">
            {SPINES.map((title, i) => {
              const n = i + 1;
              const open = viewStep === n;
              return (
                <section key={title} className={`panel ${open ? "open" : ""}`}>
                  <button
                    type="button"
                    className="spine"
                    onClick={() => setViewStep(n)}
                    disabled={!stepUnlocked[i]}
                    aria-expanded={open}
                    aria-controls={`step-panel-${n}`}
                  >
                    <span className="p-idx num">{`0${n}`}</span>
                    <span className="p-title">{title}</span>
                    <span className={`p-cell ${stepDone[i] ? "done" : ""}`} aria-hidden="true">
                      {stepDone[i] ? "✓" : ""}
                    </span>
                  </button>
                  {/* Kept mounted when closed (inert) — the flow's state and the
                      idOS session must survive flipping between steps. */}
                  <div className="pbody" id={`step-panel-${n}`} inert={!open}>
                    <div className="pbody-in">{panelBodies[i]}</div>
                  </div>
                </section>
              );
            })}
          </div>

          {/* idOS enclave — must be in the DOM before any idOS client is created;
              both login paths mount the enclave iframe into #idos-enclave. */}
          <div className={`enclave ${radixAccount ? "" : "gone"}`}>
            <div className="label">idOS secure enclave</div>
            <p className="enclave-hint">
              This box is served by idOS, not OTER. When your encrypted credential
              needs unlocking, the unlock button and password prompt appear here.
            </p>
            <div id="idos-enclave" className="enclave-box"></div>
          </div>

          <div className="below">
            {error && hasProfile !== false && (
              <div className="errbox">
                <ErrorText text={error} />
              </div>
            )}
            {diagnosticInfo && (
              <div>
                <p className="sh" style={{ marginBottom: 8 }}>
                  Diagnostic information · share with support
                </p>
                <pre className="diag">{diagnosticInfo}</pre>
                <button
                  className="btn ghost sm"
                  style={{ marginTop: 8 }}
                  onClick={() => navigator.clipboard.writeText(diagnosticInfo)}
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        </section>

        <footer className="foot">
          <div className="foot-top">
            <div className="foot-brand">
              <span className="logomark" aria-hidden="true">
                <i></i>
                <i className="g"></i>
                <i></i>
                <i></i>
              </span>
              <h2>OTER</h2>
              <span className="sub">Proof of Personhood</span>
            </div>
            <p className="foot-tag">
              One human, one badge. Personhood verified once via idOS FaceSign and
              issued as a soulbound NFT on Radix — proof any Radix dApp can build
              on, issued by OTER.
            </p>
          </div>

          <div className="foot-cols">
            <div>
              <h3 className="label">Proof of Personhood</h3>
              <ul>
                <li>
                  <a href="/">Verify personhood</a>
                </li>
                <li>
                  <a href="https://app.idos.network" target="_blank" rel="noopener noreferrer">
                    Get a FaceSign credential
                    <Ext />
                  </a>
                </li>
                <li>
                  <a href="https://wallet.radixdlt.com" target="_blank" rel="noopener noreferrer">
                    Install the Radix wallet
                    <Ext />
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="label">Resources</h3>
              <ul>
                <li>
                  <a href="https://oter.io" target="_blank" rel="noopener noreferrer">
                    OTER Oracle
                    <Ext />
                  </a>
                </li>
                <li>
                  <a href="https://random.oter.io" target="_blank" rel="noopener noreferrer">
                    OTER Beacon
                    <Ext />
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="label">Ecosystem</h3>
              <ul>
                <li>
                  <a href="https://tahuna.org" target="_blank" rel="noopener noreferrer">
                    Tahuna
                    <Ext />
                  </a>
                </li>
                <li>
                  <a href="https://www.radixdlt.com" target="_blank" rel="noopener noreferrer">
                    Radix DLT
                    <Ext />
                  </a>
                </li>
                <li>
                  <a href="https://idos.network" target="_blank" rel="noopener noreferrer">
                    idOS
                    <Ext />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="foot-bar">
            <span>© 2026 OTER · Proof of Personhood · Powered by idOS FaceSign</span>
            <span className="links">
              <a href="https://oter.io" target="_blank" rel="noopener noreferrer">
                oter.io
              </a>
              <a href="#top">Back to top</a>
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
