import { NextRequest, NextResponse } from 'next/server';
import { Rola } from '@radixdlt/rola';
import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk';
import { challengeStore } from '@/lib/challengeStore';
import { sessionStore } from '@/lib/sessionStore';
import { getNetworkId, getDappDefinitionAddress } from '@/lib/radix/network-config';

const networkId = getNetworkId();
const dAppDefinitionAddress = getDappDefinitionAddress();
const applicationName = 'Radix | idOS Proof-of-Personhood';
const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
  try {
    const body = await request.json();
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
  } catch (error) {
    console.error('[Backend] Failed to verify account:', error);
    return NextResponse.json(
      { error: 'Failed to verify account' },
      { status: 500 }
    );
  }
}
