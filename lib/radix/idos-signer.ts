import { Wallet } from "ethers";

// ── Radix → idOS login-key bridge ────────────────────────────────────────
//
// idOS authenticates users with an EVM (secp256k1, EIP-191 personal_sign)
// or NEAR signer. Instead of requiring MetaMask, we derive a deterministic
// EVM keypair from a ROLA signature produced by the user's Radix wallet:
//
//   privKey = HKDF-SHA256(ikm = ed25519 ROLA signature, salt, info)
//
// The wallet signs the ROLA payload:
//   blake2b(0x52 || challenge(32) || len(dappDef) || dappDef || origin)
// With a FIXED challenge, an ed25519 signature is bit-stable (RFC 8032
// signing is deterministic), so the same Radix account always yields the
// same EVM key on this dApp — recreated in-memory on every visit, never
// stored anywhere.
//
// Because the signed payload includes THIS dApp's definition address and
// origin, a ROLA proof requested by any other dApp signs different bytes
// and cannot reproduce the key. The signature (the master secret) must
// never leave the browser — do not send it to any backend and do not log it.
//
// INVARIANTS — changing ANY of these changes every derived key and locks
// users out of their idOS profiles:
//   • DERIVATION_TAG / HKDF_SALT strings
//   • the dApp definition address (per network)
//   • the page origin the wallet sees
//   • which Radix account (and its owner key) the user signs with
//
// secp256k1 Radix accounts are rejected: ECDSA signature determinism is
// wallet-implementation-defined, and a non-deterministic signature would
// derive a different key on every login.

const DERIVATION_TAG = "idos-radix-bridge/login-key/v1";
const HKDF_SALT = "idos-radix-bridge-v1";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error("Invalid hex string");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * The constant 32-byte hex challenge the Radix wallet signs for key
 * derivation. SHA-256 of the versioned domain-separation tag.
 */
export async function getDerivationChallenge(): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(DERIVATION_TAG)
  );
  return bytesToHex(new Uint8Array(digest));
}

export interface DeriveIdosSignerParams {
  /** Hex ed25519 signature from the ROLA proof (proof.proof.signature). */
  signatureHex: string;
  /** Curve reported by the wallet (proof.proof.curve). Must be "curve25519". */
  curve: string;
  /** The Radix account address that produced the proof. */
  radixAddress: string;
  /** This dApp's definition address (network-specific). */
  dappDefinitionAddress: string;
  /** The page origin the wallet saw (window.location.origin). */
  origin: string;
}

/**
 * Derive the deterministic idOS login signer from a Radix ROLA signature.
 * Runs entirely in the browser; the returned Wallet lives in memory only.
 */
export async function deriveIdosSigner(params: DeriveIdosSignerParams): Promise<Wallet> {
  const { signatureHex, curve, radixAddress, dappDefinitionAddress, origin } = params;

  if (curve !== "curve25519") {
    throw new Error(
      "This Radix account uses a legacy secp256k1 key, whose signatures are not " +
        "guaranteed to be deterministic. Radix-native idOS login needs a Curve25519 " +
        "account (the default for accounts created in the current Radix Wallet). " +
        "Please use a newer account, or the EVM wallet login instead."
    );
  }

  const sigBytes = hexToBytes(signatureHex);
  if (sigBytes.length !== 64) {
    throw new Error(`Unexpected ROLA signature length: ${sigBytes.length} bytes (expected 64)`);
  }

  const ikm = await crypto.subtle.importKey("raw", sigBytes as unknown as ArrayBuffer, "HKDF", false, [
    "deriveBits",
  ]);
  const enc = new TextEncoder();

  // secp256k1 scalar must be in [1, n-1]; a random 32-byte value is invalid
  // with probability ~2^-128, but handle it by bumping the info counter.
  for (let attempt = 0; attempt < 8; attempt++) {
    const info = `${dappDefinitionAddress}|${origin}|${radixAddress}|${attempt}`;
    const bits = await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: enc.encode(HKDF_SALT),
        info: enc.encode(info),
      },
      ikm,
      256
    );
    try {
      return new Wallet("0x" + bytesToHex(new Uint8Array(bits)));
    } catch {
      // out-of-range scalar — try the next counter
    }
  }
  throw new Error("Key derivation failed: could not produce a valid secp256k1 key");
}
