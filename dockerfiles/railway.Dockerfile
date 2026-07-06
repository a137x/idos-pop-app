# Railway build for the idOS PoP portal (Next.js standalone output).
#
# NEXT_PUBLIC_* values are BAKED INTO THE BUNDLE AT BUILD TIME. Railway passes
# service variables as build args for every ARG declared below, so the mainnet
# and stokenet services each build their own image from their own variables.
# Changing a NEXT_PUBLIC_* variable requires a redeploy (rebuild), not a restart.

FROM node:22.21.0-bullseye AS deps
WORKDIR /app
# package.json uses file:./vendor/... deps — vendor/ must exist before npm ci
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci

FROM node:22.21.0-bullseye AS builder
WORKDIR /app

ARG NEXT_PUBLIC_KWIL_NODE_URL
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY
ARG NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_RADIX_NETWORK
ARG NEXT_PUBLIC_GATEWAY_URL
ARG NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS
ENV NEXT_PUBLIC_KWIL_NODE_URL=$NEXT_PUBLIC_KWIL_NODE_URL \
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID \
    NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY=$NEXT_PUBLIC_CONSUMER_SIGNING_PUBLIC_KEY \
    NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY=$NEXT_PUBLIC_CONSUMER_ENCRYPTION_PUBLIC_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_RADIX_NETWORK=$NEXT_PUBLIC_RADIX_NETWORK \
    NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL \
    NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS=$NEXT_PUBLIC_RADIX_DAPP_DEFINITION_ADDRESS

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.21.0-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Railway injects PORT; next standalone server.js honors it.
EXPOSE 3000
CMD ["node", "server.js"]
