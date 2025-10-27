import { idOSConsumer as idOSConsumerClass } from "@idos-network/consumer";
import { hexDecode } from "@idos-network/utils/codecs";
import invariant from "tiny-invariant";
import nacl from "tweetnacl";

let cachedConsumer: idOSConsumerClass | null = null;

/**
 * Initialize the idOS Consumer SDK on the backend
 * This should only be called from API routes (server-side)
 */
export async function getIdOSConsumer() {
  if (cachedConsumer) {
    return cachedConsumer;
  }

  const NODE_URL = process.env.NEXT_PUBLIC_KWIL_NODE_URL;
  const CONSUMER_ENCRYPTION_SECRET_KEY = process.env.CONSUMER_ENCRYPTION_SECRET_KEY;
  const CONSUMER_SIGNING_SECRET_KEY = process.env.CONSUMER_SIGNING_SECRET_KEY;

  invariant(NODE_URL, "NEXT_PUBLIC_KWIL_NODE_URL is not set");
  invariant(CONSUMER_ENCRYPTION_SECRET_KEY, "CONSUMER_ENCRYPTION_SECRET_KEY is not set");
  invariant(CONSUMER_SIGNING_SECRET_KEY, "CONSUMER_SIGNING_SECRET_KEY is not set");

  // Create a signer from the secret key
  const consumerSigner = nacl.sign.keyPair.fromSecretKey(hexDecode(CONSUMER_SIGNING_SECRET_KEY));

  cachedConsumer = await idOSConsumerClass.init({
    nodeUrl: NODE_URL,
    consumerSigner,
    recipientEncryptionPrivateKey: CONSUMER_ENCRYPTION_SECRET_KEY,
  });

  return cachedConsumer;
}
