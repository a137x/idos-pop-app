import { getIdOSConsumer } from "@/lib/consumer-config";
import { NextRequest } from "next/server";

/**
 * Backend API route to verify a user's credential
 * This runs on the server and has access to your consumer keys
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = (await params).userId;
    const dataId = request.nextUrl.searchParams.get("dataId");

    if (!dataId) {
      return Response.json({ error: "dataId is required" }, { status: 400 });
    }

    // Initialize the consumer SDK with your backend keys
    const consumer = await getIdOSConsumer();

    // Get access grants for this user, filtering by data_id (credential ID)
    const { grants } = await consumer.getAccessGrants({
      user_id: userId,
      data_id: dataId, // Filter grants by the credential/data ID
    });

    if (grants.length === 0) {
      return Response.json(
        { error: "No access grant found for this credential" },
        { status: 404 }
      );
    }

    // Use the most recent grant (grants are typically returned newest first)
    const grant = grants[0];

    if (!grant) {
      return Response.json(
        {
          error: "No access grant found for this credential",
          availableGrants: grants.map(g => g.data_id)
        },
        { status: 404 }
      );
    }

    // Retrieve and decrypt the credential content
    const credentialContent = await consumer.getCredentialSharedContentDecrypted(grant.data_id);

    if (!credentialContent) {
      return Response.json(
        { error: "Could not retrieve credential content" },
        { status: 404 }
      );
    }

    // Parse the credential (it's typically a W3C Verifiable Credential in JSON format)
    const credentialData = JSON.parse(credentialContent);

    // Return the verification result
    return Response.json({
      verified: true,
      credentialData,
      grant: {
        id: grant.id,
        dataId: grant.data_id,
        grantee: grant.ag_grantee_wallet_identifier,
        owner: grant.ag_owner_user_id,
        lockedUntil: grant.locked_until,
      },
    });
  } catch (error: any) {
    console.error("[Backend] Error verifying credential:", error);
    return Response.json(
      { error: error.message || "Failed to verify credential" },
      { status: 500 }
    );
  }
}
