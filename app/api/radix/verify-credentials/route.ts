import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/sessionStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { radixAddress, evmAddress, userId, credentials } = body;

    // Validate required fields
    if (!radixAddress || !evmAddress || !userId || !credentials || !Array.isArray(credentials)) {
      return NextResponse.json(
        { error: 'Missing required fields: radixAddress, evmAddress, userId, credentials' },
        { status: 400 }
      );
    }

    // Store credentials in session
    try {
      sessionStore.setCredentialVerification(radixAddress, evmAddress, userId, credentials);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || 'Failed to store credentials' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials verified and stored',
    });
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to verify credentials';

    // Check for array access errors (different browsers phrase it differently)
    const isArrayAccessError = errorMessage.includes("reading '0'") ||
                               (errorMessage.includes("evaluating") && errorMessage.includes("[0]"));

    if (isArrayAccessError) {
      console.error('[Backend API: verify-credentials] Detected undefined array access error:', error);
    } else {
      console.error('[Backend API: verify-credentials] Error:', error);
    }

    return NextResponse.json(
      { error: `[Backend: verify-credentials] ${errorMessage}` },
      { status: 500 }
    );
  }
}
