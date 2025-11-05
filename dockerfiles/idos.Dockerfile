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

# Set build-time environment variables (required for Next.js build)
ENV NEXT_PUBLIC_RADIX_NETWORK="mainnet"
ENV NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS="your_dapp_definition_address"
ENV NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY="your_signing_public"
ENV NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY="your_encryption_public"

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