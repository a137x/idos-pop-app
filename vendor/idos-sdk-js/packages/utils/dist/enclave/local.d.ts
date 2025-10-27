import { BaseProvider, EnclaveOptions, EncryptionPasswordStore, MPCPasswordContext, PasswordContext, PrivateEncryptionProfile, PublicEncryptionProfile } from "../base-B5KmGnjr.js";
import { AddAddressMessageToSign, AddAddressSignatureMessage, Bytes, DownloadMessageToSign, DownloadSignatureMessage, PbcAddress, RemoveAddressMessageToSign, RemoveAddressSignatureMessage, UploadMessageToSign, UploadSignatureMessage } from "../types-BfDSer2T.js";
import { Store } from "../index-DdBYG9PA.js";

//#region src/mpc/client.d.ts
declare class Client {
  private readonly baseUrl;
  private readonly contractAddress;
  private engines;
  private signerType;
  private signerAddress;
  private signerPublicKey;
  private factory;
  private numNodes;
  constructor(baseUrl: string, contractAddress: PbcAddress, numMalicious: number, numNodes: number, numToReconstruct: number, signerType: string, signerAddress: string, signerPublicKey?: string);
  reconfigure(signerType: string, signerAddress: string, signerPublicKey?: string): void;
  uploadSecret(id: string, uploadSignature: UploadSignatureMessage, signature: Bytes, blindedShares: Buffer[]): Promise<{
    status: string;
  }>;
  getBlindedShares(secret: Buffer): Buffer[];
  uploadMessageToSign(uploadRequest: UploadSignatureMessage): UploadMessageToSign;
  uploadRequest(blindedShares: Buffer[]): UploadSignatureMessage;
  downloadMessageToSign(downloadRequest: DownloadSignatureMessage): DownloadMessageToSign;
  downloadRequest(publicKey: Uint8Array): DownloadSignatureMessage;
  downloadSecret(id: string, downloadRequest: DownloadSignatureMessage, signature: Bytes, secretKey: Uint8Array): Promise<{
    status: string;
    secret: Buffer | undefined;
  }>;
  addAddressMessageToSign(addressToAdd: string, publicKey: string | undefined, addressToAddType: string): AddAddressMessageToSign;
  removeAddressMessageToSign(addressToRemove: string, publicKey: string | undefined, addressToRemoveType: string): RemoveAddressMessageToSign;
  addAddress(userId: string, message: AddAddressSignatureMessage, signature: string): Promise<string>;
  removeAddress(userId: string, message: RemoveAddressSignatureMessage, signature: string): Promise<string>;
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
    numMalicious: number;
    numNodes: number;
    numToReconstruct: number;
  };
}
declare class LocalEnclave<K extends LocalEnclaveOptions = LocalEnclaveOptions> extends BaseProvider<K> {
  protected allowedEncryptionStores: EncryptionPasswordStore[];
  // Store for data
  protected store: Store;
  protected storeBase64: Store;
  protected storeObfuscated: Store;
  protected storeObfuscatedBase64: Store;
  // In case of MPC usage
  protected mpcClientInstance?: Client;
  // Stored key pair and user id for that key pair
  // those are most likely loaded from the store
  // during the load() method.
  protected storedEncryptionProfile?: PrivateEncryptionProfile;
  constructor(options: K);
  /** @override parent method to reset the enclave */
  reset(): Promise<void>;
  /** @override parent method to reconfigure the enclave */
  reconfigure(options?: Partial<K>): Promise<void>;
  /**
  
  * Return a codec that encrypts/decrypts data using a key derived from the provider's user ID.
  
  *
  
  * This ensures that data is minimally obfuscated to avoid low-sophistication attacks.
  
  */
  private userIdObfuscationCodec;
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
  addAddressMessageToSign(address: string, publicKey: string | undefined, addressToAddType: string): Promise<AddAddressMessageToSign>;
  removeAddressMessageToSign(address: string, publicKey: string | undefined, addressToRemoveType: string): Promise<RemoveAddressMessageToSign>;
  addAddressToMpcSecret(userId: string, message: AddAddressSignatureMessage, signature: string): Promise<string>;
  removeAddressFromMpcSecret(userId: string, message: RemoveAddressSignatureMessage, signature: string): Promise<string>;
}
//#endregion
export { LocalEnclave, LocalEnclaveOptions };
//# sourceMappingURL=local.d.ts.map