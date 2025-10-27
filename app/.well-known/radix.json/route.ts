import { NextResponse } from 'next/server';
import { getDappDefinitionAddress } from '@/lib/radix/network-config';

export async function GET() {
  try {
    const dAppDefinitionAddress = getDappDefinitionAddress();

    const radixManifest = {
      dApps: [
        {
          dAppDefinitionAddress,
        },
      ],
    };

    return NextResponse.json(radixManifest);
  } catch (error) {
    console.error('[radix.json] Failed to generate manifest:', error);
    return NextResponse.json(
      { error: 'Failed to generate radix.json' },
      { status: 500 }
    );
  }
}
