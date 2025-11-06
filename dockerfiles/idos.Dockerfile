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

ARG NEXT_PUBLIC_RADIX_NETWORK="mainnet"
ARG NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS="account_rdx129dglkkpjgxk60mz6fc4jpxpev5qtemjkpz87gutg2zg64ty6h2x5j"
ARG NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY="1b8172296e8d4bfe3b408881a5e38c0eeafe43a05fc06e5b5c0193d4806c3f1e"
ARG NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY="FH1nfujF0KwuC0UJYLZyo/bTQyWcVzMzcPCGvZxM1DQ="

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