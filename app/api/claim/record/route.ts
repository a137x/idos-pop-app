import { NextResponse } from 'next/server';
import { recordClaim, getExistingClaim } from '@/lib/kv';

export async function POST(request: Request) {
  try {
    const { userId, credentialId, radixAddress, evmAddress } = await request.json();

    if (!userId || !credentialId || !radixAddress || !evmAddress) {
      return NextResponse.json(
        { error: 'userId, credentialId, radixAddress, and evmAddress are required' },
        { status: 400 }
      );
    }

    // Check if already claimed
    const existing = await getExistingClaim(userId);
    if (existing) {
      return NextResponse.json(
        { error: 'Already claimed', claim: existing },
        { status: 409 }
      );
    }

    // Record the claim
    await recordClaim(userId, credentialId, radixAddress, evmAddress);

    return NextResponse.json({ success: true, nftId: credentialId });
  } catch (error) {
    console.error('Error recording claim:', error);
    return NextResponse.json(
      { error: 'Failed to record claim' },
      { status: 500 }
    );
  }
}
