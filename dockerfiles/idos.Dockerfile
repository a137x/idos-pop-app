# Base image for runtime
FROM node:22.21.0-bullseye-slim AS base
WORKDIR /app

# Dependencies installation stage (needs build tools for native modules)
FROM node:22.21.0-bullseye AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Build stage (needs build tools)
FROM node:22.21.0-bullseye AS builder
WORKDIR /app

ENV NEXT_PUBLIC_APP_URL="https://idos.radixdlt.com"
ENV NEXT_PUBLIC_GATEWAY_URL="https://mainnet.radixdlt.com"
ENV NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY="9e2f404dd0c475fdc2e664e01690769375a006a8daa9563bcfae8ae30b022851"
ENV NEXT_PUBLIC_RADIX_NETWORK="mainnet"
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="34c2afe95aaf05e42110da01060b6c4d"
ENV NEXT_PUBLIC_KWIL_NODE_URL="https://nodes.idos.network"
ENV NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS="account_rdx129dglkkpjgxk60mz6fc4jpxpev5qtemjkpz87gutg2zg64ty6h2x5j"
ENV NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY="3R1IsfJQBOKuWjt/qoo125h53b0uErGhNN6M4QQLDTw="

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Build the Next.js application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy necessary files for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib/db ./lib/db

RUN chmod -R +x ./scripts

# Expose the port the app runs on
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]