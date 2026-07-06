import { NextResponse } from 'next/server';
import { getDappDefinitionAddress } from '@/lib/radix/network-config';

// Served at /.well-known/radix.json (next.config rewrite). The Radix wallet
// fetches this to verify the origin ↔ dApp-definition two-way link; the dApp
// definition account's claimed_websites must list this origin in return.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { dApps: [{ dAppDefinitionAddress: getDappDefinitionAddress() }] },
    {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=3600',
      },
    }
  );
}
