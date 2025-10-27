# idOS Radix Proof-of-Personhood

Verify human identity via idOS credentials and mint unique Proof-of-Personhood NFTs on Radix. Ensures **one person = one NFT** using blockchain-agnostic identity verification.

## What This Does

1. User connects EVM wallet and verifies Proof-of-Personhood credential via idOS
2. User connects Radix wallet
3. Backend mints a unique PoP NFT on Radix (one per person, enforced via `userId`)
4. NFT serves as proof-of-personhood for Radix dApps without requiring EVM wallets

## How It Works

```mermaid
flowchart TD
    A[EVM Wallet] --> B[idOS Login]
    B --> C[Verify idOS Credential]
    C --> D[Extract userId]
    D --> E{Check Neon DB - already claimed?}
    E -->|No| F[Radix Wallet]
    F --> G[ROLA Verification]
    G --> H[Mint PoP NFT]
    H --> I[Record in Neon with userId and wallets]
```

**Deduplication**: `userId` is a stable, unique idOS user identifier per person. We store this in Neon Postgres along with wallet addresses and timestamps to prevent the same person from claiming multiple NFTs. It would also be possible to store the `userId` on-ledger (even hashed), to prevent the same person from minting multiple NFTs. We don't do that out of privacy concerns.

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
RADIX_COMPONENT_ADMIN_BADGE=your_admin_badge

# Neon Database (for deduplication - see below)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### 4. Set Up Neon Database
Set up a Neon Postgres database (easy via Vercel) and run the initial migration (`lib/db/migrate.sql`). Then configure your `.env.local` or production environment variables to include the `DATABASE_URL`.
**Why do we need a database?** To store claim records (userId, wallets, timestamps) and prevent the same person from claiming multiple NFTs.

### 5. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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
4. **Admin Badge Address** (`RADIX_COMPONENT_ADMIN_BADGE`)

**Note:** Both `NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS` and `RADIX_BACKEND_ACCOUNT_ADDRESS` should have the same value (your backend account address). The `NEXT_PUBLIC_` version is needed for browser access (ROLA verification in the frontend), while the non-prefixed version is for server-side operations.

The gateway URL and dashboard URLs are automatically selected based on the network, but can be overridden with `NEXT_PUBLIC_GATEWAY_URL`.

## Security

- **userId** is stored server-side only (in Neon database)
- **Wallet addresses** are recorded for audit trail (also server-side only)
- **Consumer keys** are never exposed to frontend
- **ROLA** verifies Radix wallet ownership cryptographically
- **Session-based** minting prevents replay attacks
- **One NFT per person** enforced via database unique constraint

## Troubleshooting

### "No Proof-of-Personhood found"
User needs to create FaceSign credential at [app.idos.network](https://app.idos.network/?ref=2993D304)

### "Already claimed" error
Expected behavior - this person already minted an NFT. The error includes details about when and which wallets were used.

### Database connection errors
- Check `DATABASE_URL` is set correctly in `.env.local`
- Verify Neon project is active (free tier doesn't sleep)
- Run the migration at `lib/db/migrate.sql`

### "Invalid session" when minting
Session expired (30 min timeout). User needs to reconnect and verify again.
