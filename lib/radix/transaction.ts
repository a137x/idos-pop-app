import {
  Convert,
  PrivateKey,
  RadixEngineToolkit,
  TransactionBuilder,
  generateRandomNonce,
  TransactionManifest,
} from '@radixdlt/radix-engine-toolkit';
import {
  Configuration,
  StatusApi,
  TransactionApi,
  TransactionStatus,
  TransactionSubmitResponse,
} from '@radixdlt/babylon-gateway-api-sdk';
import { getNetworkId, getGatewayUrl } from './network-config';

interface SendTransactionOptions {
  privateKey: string;
  manifest: TransactionManifest;
}

export async function sendRadixTransaction({ privateKey, manifest }: SendTransactionOptions): Promise<string> {
  // Get network configuration
  const networkId = getNetworkId();
  const gatewayUrl = getGatewayUrl();

  // 1. Setup Gateway APIs
  const apiConfiguration = new Configuration({
    basePath: gatewayUrl,
  });
  const statusApi = new StatusApi(apiConfiguration);
  const transactionApi = new TransactionApi(apiConfiguration);

  // 2. Create Private Key for signing (try Ed25519 first, it's more common)
  let notaryPrivateKey: PrivateKey;
  try {
    notaryPrivateKey = new PrivateKey.Ed25519(privateKey);
  } catch (e) {
    // If Ed25519 fails, try Secp256k1
    notaryPrivateKey = new PrivateKey.Secp256k1(privateKey);
  }

  // 3. Convert manifest instructions to string format
  const convertedInstructions = await RadixEngineToolkit.Instructions.convert(
    manifest.instructions,
    networkId,
    'String'
  );

  // 4. Get current epoch from network
  const currentEpoch = await getCurrentEpoch(statusApi);

  // 5. Build and notarize the transaction
  const notarizedTransaction = await TransactionBuilder.new().then((builder) =>
    builder
      .header({
        networkId,
        startEpochInclusive: currentEpoch,
        endEpochExclusive: currentEpoch + 10,
        nonce: generateRandomNonce(),
        notaryPublicKey: notaryPrivateKey.publicKey(),
        notaryIsSignatory: true,
        tipPercentage: 0,
      })
      .manifest(manifest)
      .sign(notaryPrivateKey) // Sign with the account owner key
      .notarize(notaryPrivateKey) // Notarize (can be same key)
  );

  // 6. Get transaction intent hash (ID)
  const transactionId = await RadixEngineToolkit.NotarizedTransaction.intentHash(notarizedTransaction);

  // 7. Compile transaction to bytes
  const compiledTransaction = await RadixEngineToolkit.NotarizedTransaction.compile(notarizedTransaction);

  // 8. Submit to Gateway
  const submissionResult = await submitTransaction(transactionApi, compiledTransaction);

  // 9. Poll for transaction status
  let transactionStatus = undefined;
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max

  while (
    (transactionStatus === undefined || transactionStatus?.status === TransactionStatus.Pending) &&
    attempts < maxAttempts
  ) {
    try {
      transactionStatus = await transactionApi.transactionStatus({
        transactionStatusRequest: {
          intent_hash: transactionId.id,
        },
      });
    } catch (err: any) {
      // Ignore status check errors, will retry
    }
    await new Promise((r) => setTimeout(r, 1000));
    attempts++;
  }

  if (transactionStatus?.status !== 'CommittedSuccess') {
    const errorMsg = transactionStatus?.error_message || 'Transaction failed or timed out';
    throw new Error(errorMsg);
  }

  return transactionId.id;
}

// Helper functions
const getCurrentEpoch = async (statusApi: StatusApi): Promise<number> =>
  statusApi.gatewayStatus().then((output) => output.ledger_state.epoch);

const submitTransaction = async (
  transactionApi: TransactionApi,
  compiledTransaction: Uint8Array
): Promise<TransactionSubmitResponse> =>
  transactionApi.transactionSubmit({
    transactionSubmitRequest: {
      notarized_transaction_hex: Convert.Uint8Array.toHexString(compiledTransaction),
    },
  });
