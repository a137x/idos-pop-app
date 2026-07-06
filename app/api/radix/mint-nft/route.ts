import { NextRequest, NextResponse } from 'next/server';
import { buildIssuePopNftManifest } from '@/lib/radix/manifests';
import { sendRadixTransaction } from '@/lib/radix/transaction';
import { sessionStore } from '@/lib/sessionStore';
import { getExistingClaim, recordClaim } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { radixAddress } = body;

    // Validate required field
    if (!radixAddress) {
      return NextResponse.json(
        { error: 'Missing required field: radixAddress' },
        { status: 400 }
      );
    }

    // CRITICAL: Validate server-side session before minting
    const validation = sessionStore.validateMintingSession(radixAddress);
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: validation.error || 'Invalid session' },
        { status: 403 }
      );
    }

    // Extract verified data from session
    const { evmAddress, userId, idosCredentials } = validation.session;

    if (idosCredentials.length === 0) {
      return NextResponse.json(
        { error: 'No verified credentials in session' },
        { status: 403 }
      );
    }

    // Use first credential for NFT metadata
    const { credentialId: idosCredentialId, issuerId: idosIssuerId } = idosCredentials[0];

    // Require userId for deduplication
    if (!userId) {
      return NextResponse.json(
        { error: 'No idOS user ID found in session.' },
        { status: 400 }
      );
    }

    // Check if this person has already claimed an NFT (using userId)
    const existingClaim = await getExistingClaim(userId);
    if (existingClaim) {
      return NextResponse.json(
        {
          error: `This person has already claimed a Proof-of-Personhood NFT`,
          alreadyClaimed: true,
          nftId: existingClaim.credentialId,
          claimedAt: existingClaim.claimedAt,
          radixAddress: existingClaim.radixAddress,
          evmAddress: existingClaim.evmAddress,
        },
        { status: 409 }
      );
    }

    // Get environment variables
    const backendAccountAddress = process.env.RADIX_BACKEND_ACCOUNT_ADDRESS;
    const backendPrivateKey = process.env.RADIX_BACKEND_PRIVATE_KEY;
    const componentAddress = process.env.RADIX_POP_COMPONENT_ADDRESS;
    const componentAdminBadge = process.env.RADIX_COMPONENT_ADMIN_BADGE_ADDRESS;

    if (!backendAccountAddress || !backendPrivateKey || !componentAddress || !componentAdminBadge) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Build the manifest
    const manifest = buildIssuePopNftManifest({
      backendAccountAddress,
      componentAddress,
      componentAdminBadge,
      idosCredentialId,
      idosIssuerId,
      recipientAddress: radixAddress,
    });

    // Send the transaction
    let transactionId: string;
    try {
      transactionId = await sendRadixTransaction({
        privateKey: backendPrivateKey,
        manifest,
      });
    } catch (txError: any) {
      // The NFT local id IS the idOS credential id, so the ledger enforces
      // one-badge-per-credential even if the claims DB lost its record
      // (e.g. a wiped local SurrealDB). Surface it as the same 409 the DB
      // dedup produces instead of a generic 500.
      if (String(txError?.message || txError).includes('NonFungibleAlreadyExists')) {
        return NextResponse.json(
          {
            error: 'A Proof-of-Personhood NFT for this credential already exists on the ledger',
            alreadyClaimed: true,
            nftId: idosCredentialId,
          },
          { status: 409 }
        );
      }
      throw txError;
    }

    // Record the claim in database (using credentialId as NFT ID)
    await recordClaim(userId, idosCredentialId, radixAddress, evmAddress);

    // Mark session as minted to prevent double minting
    sessionStore.markAsMinted(radixAddress);

    return NextResponse.json({
      success: true,
      transactionId,
      nftId: idosCredentialId,
      message: 'PoP NFT minted successfully',
    });
  } catch (error: any) {
    console.error('[MintNFT] Failed to mint NFT:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mint NFT' },
      { status: 500 }
    );
  }
}
