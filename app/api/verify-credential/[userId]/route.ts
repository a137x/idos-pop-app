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
    let result;
    try {
      result = await consumer.getAccessGrants({
        user_id: userId,
        data_id: dataId, // Filter grants by the credential/data ID
      });
    } catch (sdkError: any) {
      const errorDetails = `
idOS Consumer SDK Error
Method: consumer.getAccessGrants()
Parameters: { user_id: "${userId}", data_id: "${dataId}" }
Error: ${sdkError.message}
Stack: ${sdkError.stack}
      `.trim();

      console.error("[Backend API] idOS Consumer SDK Error:", errorDetails);
      throw new Error(`idOS Consumer SDK getAccessGrants() failed: ${sdkError.message}`);
    }

    const grants = result?.grants;

    if (!grants || grants.length === 0) {
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
    const credentialContent = await consumer.getSharedCredentialContentDecrypted(grant.data_id);

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
    const errorMessage = error.message || "Failed to verify credential";

    // Check for array access errors (different browsers phrase it differently)
    // Chrome/Firefox: "Cannot read properties of undefined (reading '0')"
    // Safari/iOS: "undefined is not an object (evaluating 'e[0]')"
    const isArrayAccessError = errorMessage.includes("reading '0'") ||
                               (errorMessage.includes("evaluating") && errorMessage.includes("[0]"));

    if (isArrayAccessError) {
      console.error("[Backend API: verify-credential] Detected undefined array access error:", error);
      console.error("[Backend API: verify-credential] This likely means consumer.getAccessGrants returned undefined or malformed data");
    } else {
      console.error("[Backend API: verify-credential] Error:", error);
    }

    return Response.json(
      { error: `[Backend: verify-credential] ${errorMessage}` },
      { status: 500 }
    );
  }
}
