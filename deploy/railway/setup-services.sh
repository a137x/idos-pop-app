#!/usr/bin/env bash
# Provision one network environment of the PoP portal on Railway (project OTER):
#   <web service> (this repo, dockerfiles/railway.Dockerfile)  +  <db service> (SurrealDB + volume)
#
# Usage:
#   deploy/railway/setup-services.sh mainnet  deploy/railway/vars-mainnet.env
#   deploy/railway/setup-services.sh stokenet deploy/railway/vars-stokenet.env
#
# The vars file is KEY=VALUE lines (see vars.env.example) — gitignored, holds secrets.
# Re-runnable: existing services/volumes make the create steps no-ops (errors tolerated),
# variables are re-set, and a fresh deploy is pushed.
#
# NOTE: NEXT_PUBLIC_* variables are baked at BUILD time (Dockerfile ARGs) — changing
# one requires a redeploy (`railway up`), not a service restart.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

NETWORK="${1:?usage: setup-services.sh <mainnet|stokenet> <vars-file>}"
VARS_FILE="${2:?usage: setup-services.sh <mainnet|stokenet> <vars-file>}"
PROJECT_ID="${RAILWAY_PROJECT_ID:-892946c3-6d30-4378-94cf-1023b7bbdde4}"   # OTER
railway link --project "$PROJECT_ID" --environment production >/dev/null
RW=(railway)

case "$NETWORK" in
  mainnet)  WEB=idos-pop          DB=idos-pop-db          DOMAIN=idos.oter.io ;;
  stokenet) WEB=idos-pop-stokenet DB=idos-pop-stokenet-db DOMAIN=idos-stokenet.oter.io ;;
  *) echo "network must be mainnet|stokenet" >&2; exit 1 ;;
esac
[[ -f "$VARS_FILE" ]] || { echo "vars file not found: $VARS_FILE" >&2; exit 1; }

echo "▸ [$NETWORK] db service: $DB"
"${RW[@]}" add --service "$DB" \
  --variables "SURREAL_USER=root" \
  --variables "SURREAL_PASS=$(openssl rand -hex 24)" \
  --variables "SURREAL_BIND=0.0.0.0:8000" \
  || echo "  (service exists — keeping its SURREAL_PASS)"
# volume attach wants the service ID, not its name; `up` must NOT get a path
# argument (a "." path arg breaks the CLI's prefix computation).
DB_ID=$(railway status --json | python3 -c "import json,sys; print(next(s['node']['id'] for s in json.load(sys.stdin)['services']['edges'] if s['node']['name']=='$DB'))")
railway volume -s "$DB_ID" add -m /data || echo "  (volume exists)"
( cd deploy/railway/surrealdb && railway up --service "$DB" --detach )

echo "▸ [$NETWORK] web service: $WEB"
"${RW[@]}" add --service "$WEB" || echo "  (service exists)"

# app vars from file (secrets + NEXT_PUBLIC build args)
VARS=()
while IFS= read -r line; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  VARS+=("$line")
done < "$VARS_FILE"
# db wiring — password by cross-service reference, host via private networking
VARS+=(
  "SURREALDB_URL=http://$DB.railway.internal:8000"
  "SURREALDB_USER=root"
  "SURREALDB_PASS=\${{$DB.SURREAL_PASS}}"
  "SURREALDB_NAMESPACE=idos_pop"
  "SURREALDB_DATABASE=idos_pop"
)
"${RW[@]}" variable set --service "$WEB" --skip-deploys "${VARS[@]}"

echo "▸ [$NETWORK] domain: $DOMAIN"
"${RW[@]}" domain "$DOMAIN" --service "$WEB" || echo "  (domain exists)"

echo "▸ [$NETWORK] deploying web…"
railway up --service "$WEB" --detach

echo "✓ [$NETWORK] done — add the CNAME shown above in Cloudflare (proxied is fine), then verify https://$DOMAIN/api/health"
