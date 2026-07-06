import { POP_CLAIMS_DDL } from './schema';

/**
 * SurrealDB client — plain HTTP /sql calls, no driver dependency.
 *
 * Local dev shares the OTER stack's SurrealDB server (:8000, root/root) but
 * lives in its own namespace/database, isolated from the oracle indexer data.
 * Production points the same env vars at a dedicated SurrealDB instance.
 *
 * String values are inlined as JSON-escaped literals (valid SurrealQL), so
 * always wrap dynamic input with surrealStr() — never interpolate raw.
 */

const SURREALDB_URL = process.env.SURREALDB_URL || 'http://127.0.0.1:8000';
const SURREALDB_USER = process.env.SURREALDB_USER || 'root';
const SURREALDB_PASS = process.env.SURREALDB_PASS || 'root';
const SURREALDB_NAMESPACE = process.env.SURREALDB_NAMESPACE || 'idos_pop';
const SURREALDB_DATABASE = process.env.SURREALDB_DATABASE || 'idos_pop';

interface SurrealStatementResult {
  status: 'OK' | 'ERR';
  result: unknown;
  time?: string;
}

/** Escape a JS string as a SurrealQL string literal. */
export function surrealStr(value: string): string {
  return JSON.stringify(value);
}

/**
 * Run SurrealQL and return the LAST statement's rows.
 * Throws if the server is unreachable or any statement errors.
 */
export async function surrealQuery<T = unknown>(sql: string): Promise<T[]> {
  const response = await fetch(`${SURREALDB_URL}/sql`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain',
      'surreal-ns': SURREALDB_NAMESPACE,
      'surreal-db': SURREALDB_DATABASE,
      Authorization:
        'Basic ' + Buffer.from(`${SURREALDB_USER}:${SURREALDB_PASS}`).toString('base64'),
    },
    body: sql,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`SurrealDB HTTP ${response.status}: ${await response.text()}`);
  }

  const results = (await response.json()) as SurrealStatementResult[];
  const failed = results.find((r) => r.status !== 'OK');
  if (failed) {
    throw new Error(
      typeof failed.result === 'string' ? failed.result : JSON.stringify(failed.result)
    );
  }

  const last = results[results.length - 1]?.result;
  if (Array.isArray(last)) return last as T[];
  return last == null ? [] : [last as T];
}

// Namespace/database/table bootstrap. SurrealDB does NOT auto-create the
// namespace referenced by the session headers, so the first query of each
// process runs this idempotent DDL (root-level DEFINEs succeed even while the
// header ns/db doesn't exist yet — verified against SurrealDB v3.0.4).
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = surrealQuery(
      `
DEFINE NAMESPACE IF NOT EXISTS ${SURREALDB_NAMESPACE};
USE NS ${SURREALDB_NAMESPACE};
DEFINE DATABASE IF NOT EXISTS ${SURREALDB_DATABASE};
USE DB ${SURREALDB_DATABASE};
${POP_CLAIMS_DDL}
`
    ).then(
      () => undefined,
      (err) => {
        schemaReady = null; // retry on next call instead of caching the failure
        throw err;
      }
    );
  }
  return schemaReady;
}
