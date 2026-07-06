# Dedicated SurrealDB instance for the PoP claims store (one per network env).
# The upstream image has no default subcommand, so bake `start` here; all
# tunables come from SURREAL_* env vars set on the Railway service:
#   SURREAL_USER / SURREAL_PASS  — root credentials (PASS is a strong secret)
#   SURREAL_BIND                 — 0.0.0.0:8000 (private networking)
# Data lives on a Railway volume mounted at /data.
FROM surrealdb/surrealdb:v3.0.4
CMD ["start", "--log", "info", "rocksdb:/data/db"]
