/**
 * One-shot on-chain provisioning for the PoP issuer (mainnet or stokenet).
 *
 * Publishes the idos_pop_issuer package, instantiates ProofOfPersonIssuer
 * (dApp definition = the deterministic pop-backend account, which also signs
 * badge mints and receives the 5 controller badges), and sets Radix-standard
 * dApp-definition metadata on that account (account_type, name, icon,
 * claimed_websites, claimed_entities) so wallets show a verified dApp.
 *
 * The pop-backend account pays all fees itself:
 *   - stokenet: auto-funds from the faucet
 *   - mainnet:  exits with the address to fund if the balance is too low
 *
 * Usage:
 *   NETWORK=stokenet IDOS_POP_SEED_HEX=<32-byte-hex> APP_ORIGIN=https://idos-stokenet.oter.io \
 *     ./node_modules/.bin/tsx scripts/provision-onchain.ts
 *
 * Env:
 *   NETWORK                       mainnet | stokenet            (required)
 *   IDOS_POP_SEED_HEX             32-byte hex Ed25519 seed      (required; KEEP — it IS the backend key)
 *   APP_ORIGIN                    e.g. https://idos.oter.io     (required; claimed_websites)
 *   DAPP_NAME                     default "OTER Proof of Personhood"
 *   DAPP_DESCRIPTION              default below
 *   POP_KEY_IMAGE_URL             default https://oter.io/idos-pop-badge.png
 *   POP_ICON_URL                  default https://oter.io/idos-pop-icon.png
 *   RADIX_POP_COMPONENT_ADDRESS   set to skip publish+instantiate (metadata-only rerun)
 *   RADIX_POP_RESOURCE_ADDRESS    with the above: claimed_entities for metadata-only rerun
 *   RADIX_COMPONENT_ADMIN_BADGE_ADDRESS  with the above (controller badge resource)
 *   SKIP_METADATA=1               skip the dApp-definition metadata step
 *   MIN_XRD                       funding threshold (default 60)
 *
 * Output: prints and writes .env.provision.<network> with the service env block.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import {
  Convert,
  PrivateKey,
  RadixEngineToolkit,
  TransactionBuilder,
  TransactionManifest,
  generateRandomNonce,
  ManifestSborStringRepresentation,
  hash,
} from '@radixdlt/radix-engine-toolkit';

type Net = 'mainnet' | 'stokenet';

const NETWORKS: Record<Net, { id: number; gateway: string; xrd: string; faucet: string | null; dashboard: string }> = {
  mainnet: {
    id: 1,
    gateway: 'https://mainnet.radixdlt.com',
    xrd: 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd',
    faucet: null,
    dashboard: 'https://dashboard.radixdlt.com',
  },
  stokenet: {
    id: 2,
    gateway: 'https://stokenet.radixdlt.com',
    xrd: 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc',
    faucet: 'component_tdx_2_1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxyulkzl',
    dashboard: 'https://stokenet-dashboard.radixdlt.com',
  },
};

function env(name: string, fallback?: string): string {
  const v = process.env[name]?.trim();
  if (v) return v;
  if (fallback !== undefined) return fallback;
  console.error(`Missing required env: ${name}`);
  process.exit(1);
}

const network = env('NETWORK') as Net;
if (!NETWORKS[network]) {
  console.error(`NETWORK must be mainnet or stokenet, got "${network}"`);
  process.exit(1);
}
const NET = NETWORKS[network];

const seedHex = env('IDOS_POP_SEED_HEX');
const appOrigin = env('APP_ORIGIN');
const dappName = env('DAPP_NAME', 'OTER Proof of Personhood');
const dappDescription = env(
  'DAPP_DESCRIPTION',
  'One human, one badge. Personhood verified via idOS FaceSign and issued as a soulbound NFT on Radix — proof any Radix dApp can build on. Issued by OTER.'
);
// Defaults are served by the portal itself (public/); both metadata fields
// are updatable later, so artwork can be swapped without redeploying.
const keyImageUrl = env('POP_KEY_IMAGE_URL', `${appOrigin}/idos-nft-image.png`);
const iconUrl = env('POP_ICON_URL', `${appOrigin}/idos-icon.png`);
const minXrd = Number(env('MIN_XRD', '60'));

const ARTIFACTS = path.join(__dirname, '..', 'scrypto', 'idos-pop-scrypto', 'target', 'wasm32-unknown-unknown', 'release');

// ---------- gateway helpers ----------

async function gw<T = any>(p: string, body: unknown): Promise<T> {
  const res = await fetch(`${NET.gateway}${p}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'rdx-app-name': 'oter-pop-provisioner' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gateway ${p} -> ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function currentEpoch(): Promise<number> {
  const s = await gw<{ ledger_state: { epoch: number } }>('/status/gateway-status', {});
  return s.ledger_state.epoch;
}

async function xrdBalance(address: string): Promise<number> {
  const r = await gw<any>('/state/entity/details', { addresses: [address] });
  const items = r.items?.[0]?.fungible_resources?.items ?? [];
  const x = items.find((i: any) => i.resource_address === NET.xrd);
  const v = x?.vaults?.items?.[0]?.amount ?? x?.amount ?? '0';
  return Number(v);
}

// ---------- tx helpers ----------

const notary = new PrivateKey.Ed25519(seedHex);

async function sendTx(label: string, manifestStr: string, blobs: Uint8Array[] = []): Promise<string> {
  const manifest: TransactionManifest = {
    instructions: { kind: 'String', value: manifestStr.trim() },
    blobs,
  } as TransactionManifest;

  const epoch = await currentEpoch();
  const tx = await TransactionBuilder.new().then((b) =>
    b
      .header({
        networkId: NET.id,
        startEpochInclusive: epoch,
        endEpochExclusive: epoch + 10,
        nonce: generateRandomNonce(),
        notaryPublicKey: notary.publicKey(),
        notaryIsSignatory: true,
        tipPercentage: 0,
      })
      .manifest(manifest)
      .notarize(notary)
  );
  const intent = await RadixEngineToolkit.NotarizedTransaction.intentHash(tx);
  const compiled = await RadixEngineToolkit.NotarizedTransaction.compile(tx);

  await gw('/transaction/submit', { notarized_transaction_hex: Convert.Uint8Array.toHexString(compiled) });
  process.stdout.write(`  [${label}] ${intent.id} `);

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const st = await gw<any>('/transaction/status', { intent_hash: intent.id });
      if (st.status === 'CommittedSuccess') {
        console.log('✓');
        return intent.id;
      }
      if (st.status === 'CommittedFailure' || st.status === 'Rejected') {
        console.log('✗');
        throw new Error(`[${label}] ${st.status}: ${st.error_message ?? JSON.stringify(st.known_payloads)}`);
      }
    } catch (e: any) {
      if (String(e.message).includes('CommittedFailure') || String(e.message).includes('Rejected')) throw e;
    }
  }
  throw new Error(`[${label}] timed out waiting for commit`);
}

async function committedDetails(intentHash: string): Promise<any> {
  return gw('/transaction/committed-details', {
    intent_hash: intentHash,
    opt_ins: { receipt_events: true, receipt_state_changes: true },
  });
}

function eventFields(details: any, eventName: string): Record<string, string> {
  const ev = (details.transaction?.receipt?.events ?? []).find((e: any) => e.name === eventName);
  if (!ev) throw new Error(`event ${eventName} not found in receipt`);
  const out: Record<string, string> = {};
  for (const f of ev.data?.fields ?? []) out[f.field_name] = f.value;
  return out;
}

function newEntityOfType(details: any, entityType: string): string {
  const ents = details.transaction?.receipt?.state_updates?.new_global_entities ?? [];
  const e = ents.find((x: any) => x.entity_type === entityType);
  if (!e) throw new Error(`no new ${entityType} in receipt`);
  return e.entity_address;
}

// ---------- main ----------

async function main() {
  const account = await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(notary.publicKey(), NET.id);
  console.log(`\nPoP provisioning on ${network}`);
  console.log(`  pop-backend account (= dApp definition): ${account}`);

  // 1. funding
  let balance = await xrdBalance(account);
  console.log(`  XRD balance: ${balance}`);
  if (balance < minXrd) {
    if (network === 'stokenet' && NET.faucet) {
      console.log('  low balance — pulling from stokenet faucet…');
      await sendTx(
        'faucet',
        `
CALL_METHOD Address("${NET.faucet}") "lock_fee" Decimal("25");
CALL_METHOD Address("${NET.faucet}") "free";
CALL_METHOD Address("${account}") "try_deposit_batch_or_abort" Expression("ENTIRE_WORKTOP") Enum<0u8>();`
      );
      balance = await xrdBalance(account);
      console.log(`  XRD balance now: ${balance}`);
    } else {
      console.error(
        `\nFUND ME: send at least ${minXrd} XRD (recommended ~200 for package publish) to\n\n  ${account}\n\nthen re-run this script with the same IDOS_POP_SEED_HEX.`
      );
      process.exit(2);
    }
  }

  // 2. publish + instantiate (skipped when the component is already known)
  let component = process.env.RADIX_POP_COMPONENT_ADDRESS?.trim() || '';
  let popResource = process.env.RADIX_POP_RESOURCE_ADDRESS?.trim() || '';
  let ctrlBadge = process.env.RADIX_COMPONENT_ADMIN_BADGE_ADDRESS?.trim() || '';
  let pkgAddress = '';

  if (!component) {
    const wasmPath = path.join(ARTIFACTS, 'idos_pop_issuer.wasm');
    const rpdPath = path.join(ARTIFACTS, 'idos_pop_issuer.rpd');
    if (!existsSync(wasmPath)) {
      console.error(`missing ${wasmPath} — run: cd scrypto/idos-pop-scrypto && scrypto build`);
      process.exit(1);
    }
    const wasm = new Uint8Array(readFileSync(wasmPath));
    const rpd = new Uint8Array(readFileSync(rpdPath));
    const codeHash = Convert.Uint8Array.toHexString(hash(wasm));
    const definition = await RadixEngineToolkit.ManifestSbor.decodeToString(
      rpd,
      NET.id,
      ManifestSborStringRepresentation.ManifestString
    );

    // lock_fee needs the full locked amount available up front (unused is
    // refunded) — cap it to what the account actually holds.
    const publishLock = Math.min(250, Math.floor(balance) - 5);
    console.log(`  publishing package (${(wasm.length / 1024).toFixed(0)} KiB wasm, fee lock ${publishLock} XRD)…`);
    const pubTx = await sendTx(
      'publish',
      `
CALL_METHOD Address("${account}") "lock_fee" Decimal("${publishLock}");
PUBLISH_PACKAGE ${definition} Blob("${codeHash}") Map<String, Tuple>();
CALL_METHOD Address("${account}") "try_deposit_batch_or_abort" Expression("ENTIRE_WORKTOP") Enum<0u8>();`,
      [wasm]
    );
    pkgAddress = newEntityOfType(await committedDetails(pubTx), 'GlobalPackage');
    console.log(`  package: ${pkgAddress}`);

    console.log('  instantiating ProofOfPersonIssuer…');
    const instTx = await sendTx(
      'instantiate',
      `
CALL_METHOD Address("${account}") "lock_fee" Decimal("25");
CALL_FUNCTION Address("${pkgAddress}") "ProofOfPersonIssuer" "instantiate"
  Address("${account}")
  "${keyImageUrl}"
  "${iconUrl}";
CALL_METHOD Address("${account}") "try_deposit_batch_or_abort" Expression("ENTIRE_WORKTOP") Enum<0u8>();`
    );
    const ev = eventFields(await committedDetails(instTx), 'ProofOfPersonIssuerInstantiatedEvent');
    component = ev.component_address;
    popResource = ev.pop_resource;
    ctrlBadge = ev.controller_badge_resource;
    console.log(`  component:        ${component}`);
    console.log(`  pop resource:     ${popResource}`);
    console.log(`  controller badge: ${ctrlBadge}`);
  } else {
    console.log(`  component provided — skipping publish/instantiate: ${component}`);
  }

  // 3. dApp-definition metadata on the pop-backend account (two-way link:
  //    resources carry dapp_definitions -> account; account claims them back)
  if (process.env.SKIP_METADATA !== '1') {
    console.log('  setting dApp-definition metadata…');
    const claimed = [component, popResource, ctrlBadge].filter(Boolean);
    await sendTx(
      'metadata',
      `
CALL_METHOD Address("${account}") "lock_fee" Decimal("15");
SET_METADATA Address("${account}") "account_type" Enum<Metadata::String>("dapp definition");
SET_METADATA Address("${account}") "name" Enum<Metadata::String>("${dappName}");
SET_METADATA Address("${account}") "description" Enum<Metadata::String>("${dappDescription}");
SET_METADATA Address("${account}") "icon_url" Enum<Metadata::Url>("${iconUrl}");
SET_METADATA Address("${account}") "claimed_websites" Enum<Metadata::OriginArray>(Array<String>("${appOrigin}"));
SET_METADATA Address("${account}") "claimed_entities" Enum<Metadata::AddressArray>(Array<Address>(${claimed
        .map((a) => `Address("${a}")`)
        .join(', ')}));`
    );
  }

  // 4. output
  const envBlock = `# Generated by scripts/provision-onchain.ts (${network}) — service env for the web portal.
# IDOS_POP_SEED_HEX=${seedHex}   <- KEEP SAFE; this IS the backend private key
NEXT_PUBLIC_RADIX_NETWORK=${network}
NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS=${account}
RADIX_BACKEND_ACCOUNT_ADDRESS=${account}
RADIX_BACKEND_PRIVATE_KEY=${seedHex}
RADIX_POP_COMPONENT_ADDRESS=${component}
RADIX_COMPONENT_ADMIN_BADGE_ADDRESS=${ctrlBadge}
# pop badge resource (accept-list for gates): ${popResource}
${pkgAddress ? `# package: ${pkgAddress}` : ''}`;

  const outPath = path.join(__dirname, '..', `.env.provision.${network}`);
  writeFileSync(outPath, envBlock + '\n');
  console.log(`\n${envBlock}\n\nwritten to ${outPath}`);
  console.log(`dashboard: ${NET.dashboard}/account/${account}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
