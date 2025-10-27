import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { challengeStore } from '@/lib/challengeStore';

export async function GET() {
  try {
    // Generate a random challenge (32 bytes hex)
    const challenge = randomBytes(32).toString('hex');

    // Store challenge with 5 minute expiry
    challengeStore.create(challenge, 5 * 60 * 1000);

    return NextResponse.json({ challenge });
  } catch (error) {
    console.error('Failed to generate challenge:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}
