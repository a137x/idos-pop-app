# idOS Radix Proof-of-Personhood

Verify human identity via idOS credentials and mint unique Proof-of-Personhood NFTs on Radix. Ensures **one person = one NFT** using blockchain-agnostic identity verification.

## What This Does

1. User connects EVM wallet and verifies Proof-of-Personhood credential via idOS
2. User connects Radix wallet
3. Backend mints a unique PoP NFT on Radix (one per person, enforced via `userId`)
4. NFT serves as proof-of-personhood for Radix dApps without requiring EVM wallets

## How It Works

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant EVM_Wallet
    participant idOS_Network
    participant Backend_API
    participant Session_Store
    participant Challenge_Store
    participant Radix_Wallet
    participant ROLA_Verifier
    participant Database
    participant Radix_Ledger
    participant Smart_Contract

    %% Step 1: EVM Wallet Connection
    Note over User,Frontend: Step 1: Connect EVM Wallet
    User->>Frontend: Click "Connect Wallet"
    Frontend->>EVM_Wallet: Open WalletConnect Modal
    EVM_Wallet-->>Frontend: Return connected address
    Frontend->>Frontend: Store EVM address in state

    %% Step 2: idOS Initialization & Credential Verification
    Note over User,idOS_Network: Step 2: Initialize idOS & Verify Credentials
    Frontend->>idOS_Network: Check if profile exists
    idOS_Network-->>Frontend: Profile exists: true

    Frontend->>EVM_Wallet: Request signer
    EVM_Wallet-->>Frontend: Return ethers.Signer

    Frontend->>idOS_Network: withUserSigner(signer).logIn()
    idOS_Network-->>Frontend: Return authenticated idOSClient

    Frontend->>idOS_Network: getAllCredentials()
    idOS_Network-->>Frontend: Return credentials list

    loop For each credential
        Frontend->>idOS_Network: requestAccessGrant(credentialId)
        idOS_Network-->>Frontend: Access grant created

        Frontend->>Backend_API: GET /api/verify-credential/[userId]
        Backend_API->>idOS_Network: getAccessGrants(userId, dataId)
        idOS_Network-->>Backend_API: Return grant
        Backend_API->>idOS_Network: getCredentialSharedContentDecrypted(dataId)
        idOS_Network-->>Backend_API: Return decrypted credential
        Backend_API-->>Frontend: Return verified credential data
        Frontend->>Frontend: Store in verifiedCredentials Map
    end

    %% Step 3: Radix Wallet Connection & ROLA Verification
    Note over User,Radix_Ledger: Step 3: Connect Radix & Verify with ROLA
    User->>Frontend: Click "Connect Radix Wallet"

    Frontend->>Backend_API: GET /api/radix/challenge
    Backend_API->>Backend_API: Generate random 32-byte challenge
    Backend_API->>Challenge_Store: Store challenge (5min expiry)
    Backend_API-->>Frontend: Return challenge

    Frontend->>Radix_Wallet: sendOneTimeRequest(accounts + proof)
    Radix_Wallet->>User: Request approval
    User->>Radix_Wallet: Approve
    Radix_Wallet->>Radix_Wallet: Sign challenge with private key
    Radix_Wallet-->>Frontend: Return address + proof (signature, publicKey)

    Frontend->>Backend_API: POST /api/radix/verify-account
    Backend_API->>Challenge_Store: Verify & consume challenge (one-time use)
    Challenge_Store-->>Backend_API: Valid
    Backend_API->>ROLA_Verifier: verifySignedChallenge(challenge, proof, address)
    ROLA_Verifier->>Radix_Ledger: Query account state via Gateway API
    Radix_Ledger-->>ROLA_Verifier: Return account public keys
    ROLA_Verifier->>ROLA_Verifier: Verify signature matches account keys
    ROLA_Verifier-->>Backend_API: Verification successful
    Backend_API->>Session_Store: setRadixVerification(radixAddress)
    Backend_API-->>Frontend: Success

    Frontend->>Backend_API: POST /api/radix/verify-credentials
    Backend_API->>Session_Store: setCredentialVerification(radix, evm, userId, credentials)
    Backend_API-->>Frontend: Credentials stored in session

    %% Step 4: Check Account Deposit Rule
    Frontend->>Radix_Ledger: GET /state/entity/details (check deposit rule)
    Radix_Ledger-->>Frontend: Return account deposit rule
    alt Deposits disabled
        Frontend->>Frontend: Display warning banner
    end

    %% Step 5: Mint NFT
    Note over User,Smart_Contract: Step 5: Mint Proof-of-Personhood NFT
    User->>Frontend: Click "Send NFT"
    Frontend->>Backend_API: POST /api/radix/mint-nft

    Backend_API->>Session_Store: validateMintingSession(radixAddress)
    Session_Store->>Session_Store: Check session exists & not expired
    Session_Store->>Session_Store: Verify rolaVerifiedAt & credentials exist
    Session_Store-->>Backend_API: Valid session (userId, credentials)

    Backend_API->>Database: getExistingClaim(userId)
    Database->>Database: SELECT * FROM pop_claims WHERE user_id = userId

    alt User already claimed
        Database-->>Backend_API: Return existing claim
        Backend_API-->>Frontend: HTTP 409 - Already claimed error
        Frontend->>User: Display "Already claimed" message
    else First time claim
        Database-->>Backend_API: null (no previous claim)

        Backend_API->>Backend_API: buildIssuePopNftManifest()
        Note right of Backend_API: Manifest:<br/>1. Lock fee (5 XRD)<br/>2. Create admin badge proof<br/>3. Call issue_pop(credentialId, issuerId, recipient)

        Backend_API->>Backend_API: sendRadixTransaction(privateKey, manifest)
        Backend_API->>Backend_API: Sign transaction with backend private key
        Backend_API->>Radix_Ledger: Submit notarized transaction

        Radix_Ledger->>Smart_Contract: Execute issue_pop()
        Smart_Contract->>Smart_Contract: Mint NFT with credentialId as NFT ID
        Smart_Contract->>Smart_Contract: Store NFT in AccountLocker (claimable)
        Smart_Contract->>Radix_Ledger: Commit transaction

        Backend_API->>Backend_API: Poll transaction status (max 30s)
        Radix_Ledger-->>Backend_API: Transaction committed successfully

        Backend_API->>Database: recordClaim(userId, credentialId, radixAddress, evmAddress)
        Database->>Database: INSERT INTO pop_claims (prevents duplicate)
        Database-->>Backend_API: Claim recorded

        Backend_API->>Session_Store: markAsMinted(radixAddress) - delete session
        Session_Store->>Session_Store: Delete session (prevent reuse)

        Backend_API-->>Frontend: Success (transactionId, nftId)
        Frontend->>User: Display success + transaction link
    end
```

**Deduplication**: `userId` is a stable, unique idOS user identifier per person. We store this in Neon Postgres along with wallet addresses and timestamps to prevent the same person from claiming multiple NFTs. It would also be possible to store the `userId` on-ledger (even hashed), to prevent the same person from minting multiple NFTs. We don't do that out of privacy concerns.

## Radix-Native idOS Login (no EVM wallet)

This fork adds a **Radix→idOS login bridge** so users log in to idOS with their
Radix wallet alone — no MetaMask. idOS authenticates with an EVM signer; instead
of connecting one, we *derive* one deterministically from a Radix signature:

1. The Radix wallet signs a ROLA proof over a **fixed derivation challenge**
   (`SHA-256("idos-radix-bridge/login-key/v1")`).
2. The ROLA payload the wallet signs binds this dApp's definition address and
   origin, and ed25519 signing (RFC 8032) is deterministic — so the same Radix
   account always produces the same signature *on this dApp only*.
3. `HKDF-SHA256(signature)` → secp256k1 key → in-memory `ethers.Wallet` →
   `idOSClient.withUserSigner(...)`. The key is recreated on each visit and
   never stored or transmitted; the signature never leaves the browser.

Implementation: `lib/radix/idos-signer.ts` (derivation), `lib/providers/radixProvider.tsx`
(one-shot ROLA challenge override), `app/page.tsx` (`loginWithRadixIdos`, `linkRadixWallet`).

**Linking an existing profile (one time):** profiles created via the idOS App are
keyed to a real EVM wallet. Log in once with that wallet, click *Link Radix login
to this profile* (calls idOS `addWallet` with the derived address), and every
later login is Radix-only.

**New users** still create their profile + FaceSign credential at
[app.idos.network](https://app.idos.network) (idOS's closed-beta issuer app),
which requires an EVM/NEAR wallet once — outside this app's control until idOS
supports Radix natively.

### Invariants — breaking any of these locks users out of their profiles

- The derivation tag / HKDF salt strings in `lib/radix/idos-signer.ts`
- The dApp definition address (per network) and the page **origin** the wallet
  sees — treat the production domain as permanent
- The user's Radix account choice (and its owner key): a different account or a
  rotated key derives a different idOS login key

Only Curve25519 (ed25519) Radix accounts are supported; legacy secp256k1
accounts are rejected because ECDSA signature determinism is
wallet-implementation-defined. Mainnet requires the dApp definition ↔ origin
two-way link (`/.well-known/radix.json` + `claimed_websites`) so the wallet
rejects origin-spoofed derivation requests.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate idOS Consumer Keys

```bash
npm run generate-keys
```

### 3. Configure Environment Variables

Create `.env.local` (use `.env.example` as template):

```env
# WalletConnect (get at https://cloud.reown.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# idOS Consumer Keys (from step 2)
CONSUMER_SIGNING_SECRET_KEY=your_signing_secret
CONSUMER_ENCRYPTION_SECRET_KEY=your_encryption_secret
NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY=your_signing_public
NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY=your_encryption_public

# Radix Network Configuration
# Set network to "mainnet" or "stokenet" (testnet)
NEXT_PUBLIC_RADIX_NETWORK=stokenet
NEXT_PUBLIC_GATEWAY_URL=https://stokenet.radixdlt.com

# dApp Definition Address (same as backend account - needs NEXT_PUBLIC_ for browser access)
NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS=your_backend_account

# Radix Backend Configuration
RADIX_BACKEND_ACCOUNT_ADDRESS=your_backend_account
RADIX_BACKEND_PRIVATE_KEY=your_backend_private_key
RADIX_POP_COMPONENT_ADDRESS=your_component_address
RADIX_COMPONENT_ADMIN_BADGE_ADDRESS=your_admin_badge_address

# SurrealDB (for deduplication - see below)
SURREALDB_URL=http://127.0.0.1:8000
SURREALDB_USER=root
SURREALDB_PASS=root
SURREALDB_NAMESPACE=idos_pop
SURREALDB_DATABASE=idos_pop
```

### 4. Set Up SurrealDB

The app connects to SurrealDB via the `SURREALDB_*` environment variables. There is no
migration step — the namespace, database, table schema, and indexes are created
idempotently on the first query (`lib/db/client.ts`).

Local dev can share an already-running SurrealDB server (e.g. the OTER stack's server on
`:8000`): the app isolates itself in its own namespace (`idos_pop` by default). For a
standalone server:

```bash
docker run --rm --pull always --name surrealdb -p 8000:8000 -v ~/mydata:/mydata \
  surrealdb/surrealdb:v3.0.4 start surrealkv:/mydata/idos-pop.db --user root --pass root
```

**Why do we need a database?** To store claim records (userId, wallets, timestamps) and prevent the same person from claiming multiple NFTs. The claim record's id IS the idOS userId, so double-claims fail atomically inside the database.

### 5. Run Locally
```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002)

## Project Structure

```
app/
├── page.tsx                        # Main verification flow
├── api/
│   ├── verify-credential/          # Verify idOS credentials
│   ├── claim/                      # Check/record NFT claims
│   └── radix/
│       ├── verify-account/         # ROLA verification
│       ├── verify-credentials/     # Store credentials in session
│       └── mint-nft/               # Mint PoP NFT (with deduplication)
lib/
├── db/
│   ├── schema.ts                   # Drizzle schema (pop_claims table)
│   ├── client.ts                   # Neon database client
│   └── migrate.sql                 # Database migration
├── kv.ts                           # Database query utilities (claim functions)
├── sessionStore.ts                 # Server-side session management
├── consumer-config.ts              # idOS consumer setup
└── radix/                          # Radix transaction utilities
    ├── manifests.ts                # Transaction manifests
    └── transaction.ts              # Transaction sending
```

## Network Configuration

The app supports both Radix **Mainnet** and **Stokenet** (testnet). Configure the network via environment variables:

### Switching Networks

Set `NEXT_PUBLIC_RADIX_NETWORK` to either:
- `mainnet` - Production Radix network
- `stokenet` - Testnet for development

**Important:** When switching networks, you must also update:
1. **dApp Definition Address** (`NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS`) - Set this to the same value as your backend account
   - Mainnet addresses start with `account_rdx`
   - Stokenet addresses start with `account_tdx_2_`
2. **Backend Account Address** (`RADIX_BACKEND_ACCOUNT_ADDRESS`) - Same address as above
3. **PoP Component Address** (`RADIX_POP_COMPONENT_ADDRESS`)
4. **Admin Badge Address** (`RADIX_COMPONENT_ADMIN_BADGE_ADDRESS`)

**Note:** Both `NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS` and `RADIX_BACKEND_ACCOUNT_ADDRESS` should have the same value (your backend account address). The `NEXT_PUBLIC_` version is needed for browser access (ROLA verification in the frontend), while the non-prefixed version is for server-side operations.

The gateway URL and dashboard URLs are automatically selected based on the network, but can be overridden with `NEXT_PUBLIC_GATEWAY_URL`.

## Mainnet Launch Checklist (OTER)

Three things become **permanent** the moment real users onboard — decide them before launch, they cannot be changed after:

1. **Origin / domain** (`https://idos.oter.io`). The Radix-native login bridge hashes the page
   origin into every user's derived idOS key — moving domains later locks users out of their
   profiles (see the Invariants section above).
2. **dApp definition account.** Also a key-derivation input, and what the Radix wallet displays
   on every connect/sign. Before launch, set its on-ledger metadata: `account_type: "dapp definition"`,
   `name`/`description`/`icon_url` (OTER branding), and `claimed_websites: ["https://idos.oter.io"]`
   for the two-way link with `/.well-known/radix.json` (served by this app).
3. **PoP resource metadata.** `name`, `symbol`, and `description` on the NFT resource are `locked`
   at instantiate (see `scrypto/idos-pop-scrypto/src/lib.rs`) — whatever the mainnet instantiate
   ships is branded forever. Only `icon_url` stays updatable.

Also before public hosting: LICENSE clarification from the upstream repo owners (radixdlt/idos-pop-app
has no LICENSE file).

## Security

- **userId** is stored server-side only (in SurrealDB)
- **Wallet addresses** are recorded for audit trail (also server-side only)
- **Consumer keys** are never exposed to frontend
- **ROLA** verifies Radix wallet ownership cryptographically
- **Session-based** minting prevents replay attacks
- **One NFT per person** enforced atomically — the claim record id IS the idOS userId

## Troubleshooting

### "No Proof-of-Personhood found"
User needs to create FaceSign credential at [app.idos.network](https://app.idos.network)

### "Already claimed" error
Expected behavior - this person already minted an NFT. The error includes details about when and which wallets were used.

### Database connection errors
- Check the `SURREALDB_*` variables in `.env.local`
- Ensure SurrealDB is reachable: `curl -s http://127.0.0.1:8000/health`
- Inspect the claims table:
  ```bash
  curl -s -u root:root -H 'Accept: application/json' \
    -H 'surreal-ns: idos_pop' -H 'surreal-db: idos_pop' \
    -X POST http://127.0.0.1:8000/sql --data 'SELECT * FROM pop_claims;'
  ```

### "Invalid session" when minting
Session expired (30 min timeout). User needs to reconnect and verify again.
