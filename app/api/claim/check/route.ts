import { NextResponse } from 'next/server';
import { checkClaim } from '@/lib/kv';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await checkClaim(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking claim:', error);
    return NextResponse.json(
      { error: 'Failed to check claim status' },
      { status: 500 }
    );
  }
}
