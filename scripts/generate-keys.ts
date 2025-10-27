/**
 * Generate consumer keys for the idOS SDK
 *
 * This script generates the signing and encryption keypairs needed
 * to initialize the idOS Consumer SDK on your backend.
 *
 * IMPORTANT: Store these keys securely! If you lose them, you won't
 * be able to decrypt user credentials.
 *
 * Usage:
 *   npm run generate-keys
 */

import nacl from "tweetnacl";
import { Buffer } from "buffer";

console.log("=".repeat(60));
console.log("Generating idOS Consumer Keys");
console.log("=".repeat(60));
console.log();

// Generate signing keypair (Ed25519)
console.log("1. SIGNING KEYPAIR (Nacl Ed25519)");
console.log("-".repeat(60));
const signingKeyPair = nacl.sign.keyPair();
const signingSecretHex = Buffer.from(signingKeyPair.secretKey).toString("hex");
const signingPublicHex = Buffer.from(signingKeyPair.publicKey).toString("hex");

console.log("Secret Key (64 bytes):");
console.log(signingSecretHex);
console.log();
console.log("Public Key (32 bytes):");
console.log(signingPublicHex);
console.log();

// Generate encryption keypair (X25519/Box)
console.log("2. ENCRYPTION KEYPAIR (Nacl Box)");
console.log("-".repeat(60));
const encryptionKeyPair = nacl.box.keyPair();
const encryptionSecretBase64 = Buffer.from(encryptionKeyPair.secretKey).toString("base64");
const encryptionPublicBase64 = Buffer.from(encryptionKeyPair.publicKey).toString("base64");

console.log("Secret Key (32 bytes, base64):");
console.log(encryptionSecretBase64);
console.log();
console.log("Public Key (32 bytes, base64):");
console.log(encryptionPublicBase64);
console.log();

// Generate .env.local content
console.log("=".repeat(60));
console.log("Copy this to your .env.local file:");
console.log("=".repeat(60));
console.log();
console.log("NEXT_PUBLIC_KWIL_NODE_URL=https://nodes.idos.network");
console.log("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_from_reown_cloud");
console.log();
console.log("# Backend keys (KEEP SECRET!)");
console.log(`CONSUMER_SIGNING_SECRET_KEY=${signingSecretHex}`);
console.log(`CONSUMER_ENCRYPTION_SECRET_KEY=${encryptionSecretBase64}`);
console.log();
console.log("# Public keys (safe to expose in frontend)");
console.log(`NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY=${signingPublicHex}`);
console.log(`NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY=${encryptionPublicBase64}`);
console.log();

console.log("=".repeat(60));
console.log("⚠️  IMPORTANT SECURITY NOTES:");
console.log("=".repeat(60));
console.log("1. NEVER commit these keys to version control");
console.log("2. NEVER expose secret keys in your frontend code");
console.log("3. BACKUP these keys securely - losing them means losing");
console.log("   access to all encrypted credentials");
console.log("4. Use different keys for development and production");
console.log("5. Get your WalletConnect project ID from https://cloud.reown.com");
console.log("=".repeat(60));
