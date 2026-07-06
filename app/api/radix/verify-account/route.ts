import { NextRequest, NextResponse } from 'next/server';
import { Rola } from '@radixdlt/rola';
import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk';
import { challengeStore } from '@/lib/challengeStore';
import { sessionStore } from '@/lib/sessionStore';
import { getNetworkId, getDappDefinitionAddress } from '@/lib/radix/network-config';

const networkId = getNetworkId();
const dAppDefinitionAddress = getDappDefinitionAddress();
// ASCII only — this string is sent as an HTTP header (RDX-App-Name) on every
// gateway call; the gateway edge rejects non-ASCII header values with 400.
const applicationName = 'OTER Proof of Personhood';
// MUST match the origin the wallet saw when signing the ROLA payload — i.e. the
// page origin. Local dev is pinned to :3002 (Tahuna owns :3000, oracle FE :3001);
// production sets NEXT_PUBLIC_APP_URL (e.g. https://idos.oter.io).
const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

// Initialize ROLA
const gatewayApiClient = GatewayApiClient.initialize({
  networkId,
  applicationName,
});

const { verifySignedChallenge } = Rola({
  networkId,
  applicationName,
  dAppDefinitionAddress,
  expectedOrigin,
  gatewayApiClient,
});

export async function POST(request: NextRequest) {
  // DEBUG: Log immediately to verify request reaches the app
  console.log('[verify-account] ========== REQUEST RECEIVED ==========');
  console.log('[verify-account] Method:', request.method);
  console.log('[verify-account] URL:', request.url);
  console.log('[verify-account] Headers:', Object.fromEntries(request.headers.entries()));

  try {
    const body = await request.json();
    console.log('[verify-account] Body parsed successfully');
    const { challenge, proof } = body;

    if (!challenge || !proof) {
      return NextResponse.json(
        { error: 'Missing challenge or proof' },
        { status: 400 }
      );
    }

    // Verify challenge is valid and not expired (consume it - one-time use)
    const isValidChallenge = challengeStore.consume(challenge);
    if (!isValidChallenge) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge' },
        { status: 400 }
      );
    }

    // Verify ROLA proof
    const result = await verifySignedChallenge({
      challenge,
      proof: {
        publicKey: proof.publicKey,
        signature: proof.signature,
        curve: proof.curve,
      },
      address: proof.address,
      type: 'account',
    });

    if (result.isErr()) {
      return NextResponse.json(
        { error: 'Failed to verify account ownership', details: result.error },
        { status: 400 }
      );
    }

    // Create server-side session to track ROLA verification
    sessionStore.setRadixVerification(proof.address);

    // Verification successful!
    return NextResponse.json({
      success: true,
      address: proof.address,
      verified: true,
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to verify account';

    // Check for array access errors (different browsers phrase it differently)
    const isArrayAccessError = errorMessage.includes("reading '0'") ||
                               (errorMessage.includes("evaluating") && errorMessage.includes("[0]"));

    if (isArrayAccessError) {
      console.error('[Backend API: verify-account] Detected undefined array access error:', error);
    } else {
      console.error('[Backend API: verify-account] Error:', error);
    }

    return NextResponse.json(
      { error: `[Backend: verify-account] ${errorMessage}` },
      { status: 500 }
    );
  }
}
