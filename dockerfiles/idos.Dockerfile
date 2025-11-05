# Base node image
FROM node:22.21.0-bullseye-slim AS base
WORKDIR /app

ENV DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate 

# Install Turbo globally
FROM base AS builder

RUN pnpm add -g turbo@2.3.3

# Copy all files
COPY . .

# Prune the monorepo for the clinch package
RUN turbo prune idos-radix-verify --docker

# Development dependencies installation stage
FROM base AS installer

COPY --from=builder /app/out/json/ .
RUN pnpm install

# Copy source code and build
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=idos-radix-verify...

# Production image
FROM base AS runner
WORKDIR /app

# Copy built application
COPY --from=installer /app/apps/ apps
COPY --from=installer /app/packages/ packages
COPY --from=installer /app/node_modules/ node_modules
COPY --from=installer /app/apps/idos-radix-verify/public/ /app/apps/idos-radix-verify/.next/standalone/apps/idos-radix-verify/public
COPY --from=installer /app/apps/idos-radix-verify/.next/static /app/apps/idos-radix-verify/.next/standalone/apps/idos-radix-verify/.next/static

CMD node apps/idos-radix-verify/.next/standalone/apps/idos-radix-verify/server.js