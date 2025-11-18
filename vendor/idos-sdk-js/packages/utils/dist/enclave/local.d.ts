import { BaseProvider, EnclaveOptions, EncryptionPasswordStore, MPCPasswordContext, PasswordContext, PrivateEncryptionProfile, PublicEncryptionProfile } from "../base-ViJoJtLW.js";
import { Store } from "../index-B2oV2QlU.js";
import { TypedDataDomain, TypedDataField } from "ethers";

//#region src/mpc/types.d.ts
type PbcAddress = string;
type Bytes32 = string;
type Address = string;
type Bytes = string;
interface UploadSignatureMessage {
  share_commitments: Bytes32[];
  recovering_addresses: Address[];
}
interface DownloadSignatureMessage {
  recovering_address: Address;
  timestamp: number;
  public_key: Bytes32;
}
type DownloadMessageToSign = {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  value: DownloadSignatureMessage;
};
type UploadMessageToSign = {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  value: UploadSignatureMessage;
};
//#endregion
//#region src/mpc/client.d.ts
declare class Client {
  private readonly baseUrl;
  private readonly contractAddress;
  private engines;
  constructor(baseUrl: string, contractAddress: PbcAddress);
  uploadSecret(id: string, uploadSignature: UploadSignatureMessage, signature: Bytes, blindedShares: Buffer[]): Promise<{
    status: string;
  }>;
  getBlindedShares(secret: Buffer): Buffer[];
  uploadMessageToSign(uploadRequest: UploadSignatureMessage): UploadMessageToSign;
  uploadRequest(blindedShares: Buffer[], signerAddress: string, additionalRecoveringAddresses?: string[]): UploadSignatureMessage;
  downloadMessageToSign(downloadRequest: DownloadSignatureMessage): DownloadMessageToSign;
  downloadRequest(signerAddress: string, publicKey: Uint8Array): DownloadSignatureMessage;
  downloadSecret(id: string, downloadRequest: DownloadSignatureMessage, signature: Bytes, secretKey: Uint8Array): Promise<{
    status: string;
    secret: Buffer | undefined;
  }>;
  // public async updateWallets(id: string, additionalRecoveringAddresses: string[]) {
  //   const updateRequest: UpdateWalletsSignatureMessage = {
  //     recovering_addresses: [await this.signer.getAddress(), ...additionalRecoveringAddresses],
  //     timestamp: new Date().getTime(),
  //   };
  //   const signature = await this.signer.signTypedData(
  //     this.getTypedDomain(),
  //     UPDATE_TYPES,
  //     updateRequest
  //   );
  //   const engineClients = await this.getEngines();
  //   const promises = [];
  //   for (let i = 0; i < engineClients.length; i++) {
  //     const engineClient = engineClients[i];
  //     promises.push(engineClient.sendUpdate(id, updateRequest, signature));
  //   }
  //   await Promise.all(promises);
  // }
  private getTypedDomain;
  private getEngines;
  private static blindShare;
}
//#endregion
//#region src/enclave/local.d.ts
interface LocalEnclaveOptions extends EnclaveOptions {
  store?: Store;
  allowedEncryptionStores?: EncryptionPasswordStore[];
  mpcConfiguration?: {
    nodeUrl: string;
    contractAddress: string;
  };
}
declare class LocalEnclave<K extends LocalEnclaveOptions = LocalEnclaveOptions> extends BaseProvider<K> {
  protected allowedEncryptionStores: EncryptionPasswordStore[];
  // Store for data
  protected store: Store;
  protected storeWithCodec: Store;
  // In case of MPC usage
  protected mpcClientInstance?: Client;
  // Stored key pair and user id for that key pair
  // those are most likely loaded from the store
  // during the load() method.
  protected storedEncryptionProfile?: PrivateEncryptionProfile;
  constructor(options: K);
  /** @override parent method to reset the enclave */
  reset(): Promise<void>;
  /** @see parent method extended with loading the profile from the store */
  load(): Promise<void>;
  /**
  * Encrypts a message to a receiver.
  * This method also checks if the user is authorized to use the keys.
  *
  * @param message - The message to encrypt.
  * @param receiverPublicKey - The public key of the receiver.
  *
  * @returns The encrypted message.
  */
  encrypt(message: Uint8Array, receiverPublicKey: Uint8Array): Promise<{
    content: Uint8Array;
    encryptorPublicKey: Uint8Array;
  }>;
  /**
  * Decrypts a message from a sender.
  * This method also checks if the user is authorized to use the keys.
  *
  * @param message - The message to decrypt.
  * @param senderPublicKey - The public key of the sender.
  *
  * @returns The decrypted message.
  */
  decrypt(message: Uint8Array, senderPublicKey: Uint8Array): Promise<Uint8Array<ArrayBufferLike>>;
  /**
  * @see BaseProvider#getPrivateEncryptionProfile
  */
  getPrivateEncryptionProfile(skipGuard?: boolean): Promise<PrivateEncryptionProfile>;
  /** @see BaseProvider#ensureUserEncryptionProfile */
  ensureUserEncryptionProfile(): Promise<PublicEncryptionProfile>;
  /**
  * This method needs to check `options` and should derive the password context from it.
  *
  * @returns The password context.
  */
  getPasswordContext(): Promise<PasswordContext | MPCPasswordContext>;
  /**
  * Creates and store encryption profile from a password.
  *
  * @param password - The password to use.
  * @param userId - The user id to use.
  * @param encryptionPasswordStore - The encryption password store to use.
  *
  * @returns The encryption profile.
  */
  createEncryptionProfileFromPassword(password: string, userId: string, encryptionPasswordStore: EncryptionPasswordStore): Promise<PrivateEncryptionProfile>;
  protected ensureMPCPassword(): Promise<string>;
  private get mpcClient();
  private generatePassword;
  private downloadSecret;
  private uploadSecret;
}
//#endregion
export { LocalEnclave, LocalEnclaveOptions };
//# sourceMappingURL=local.d.ts.map