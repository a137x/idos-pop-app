import { NextResponse } from 'next/server';
import { getCurrentNetwork } from '@/lib/radix/network-config';

// Railway healthcheck target. Deliberately does NOT touch SurrealDB or the
// gateway — a dependency blip must not make the platform kill the web service.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, network: getCurrentNetwork() });
}
