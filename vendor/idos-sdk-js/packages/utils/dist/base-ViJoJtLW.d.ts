import { z } from "zod";

//#region ../@credentials/src/utils/types.d.ts
type idOSCredential = {
  id: string;
  user_id: string;
  issuer_auth_public_key: string;
  original_id?: string;
  public_notes: string;
  content: string;
  encryptor_public_key: string;
};
//#endregion
//#region src/enclave/types.d.ts
declare const EncryptionPasswordStoresEnum: z.ZodEnum<{
  mpc: "mpc";
  user: "user";
}>;
type EncryptionPasswordStore = z.infer<typeof EncryptionPasswordStoresEnum>;
type PublicEncryptionProfile = {
  userId: string;
  userEncryptionPublicKey: string;
  encryptionPasswordStore: EncryptionPasswordStore;
};
type PrivateEncryptionProfile = {
  userId: string;
  password: string;
  keyPair: nacl.BoxKeyPair;
  encryptionPasswordStore: EncryptionPasswordStore;
};
type EnclaveOptions = {
  theme?: "light" | "dark";
  mode?: "new" | "existing";
  userId?: string;
  expectedUserEncryptionPublicKey?: string;
  walletAddress?: string;
  encryptionPasswordStore?: EncryptionPasswordStore;
};
type PasswordContext = {
  encryptionPasswordStore: "user";
  password: string;
  duration?: number;
};
type MPCPasswordContext = {
  encryptionPasswordStore: "mpc";
};
//#endregion
//#region src/enclave/base.d.ts
declare abstract class BaseProvider<K extends EnclaveOptions = EnclaveOptions> {
  readonly options: K;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: Change this when we know how to MPC & other chains
  protected _signMethod?: (domain: any, types: any, value: any) => Promise<string>;
  constructor(options: K);
  /**
  * Sets the signer for the enclave.
  *
  * @param signer - The signer to set, is later used for MPC if allowed.
  */
  setSigner(signer: {
    signTypedData: (domain: string, types: string[], value: string) => Promise<string>;
  }): void;
  // biome-ignore lint/suspicious/noExplicitAny: TODO: Change this when we know how to MPC & other chains
  signTypedData(domain: any, types: any, value: any): Promise<string>;
  /**
  * Helper method to get the user ID.
  *
  * @returns The user ID.
  */
  get userId(): string;
  /**
  * Resets the enclave (storage etc.)
  */
  reset(): Promise<void>;
  /**
  * Reconfigures the enclave (theme etc).
  *
  * @param options - The options to reconfigure.
  */
  reconfigure(options?: Partial<K>): Promise<void>;
  /**
  * Loads the enclave (create iframe, open connection, etc.)
  */
  load(): Promise<void>;
  /**
  * Encrypts a message to a receiver.
  * This method also checks if the user is authorized to use the keys.
  *
  * @param _message - The message to encrypt.
  * @param _receiverPublicKey - The public key of the receiver.
  *
  * @returns The encrypted message.
  */
  encrypt(_message: Uint8Array, _receiverPublicKey: Uint8Array): Promise<{
    content: Uint8Array;
    encryptorPublicKey: Uint8Array;
  }>;
  /**
  * Decrypts a message from a sender.
  * This method also checks if the user is authorized to use the keys.
  *
  * @param _message - The message to decrypt.
  * @param _senderPublicKey - The public key of the sender.
  *
  * @returns The decrypted message.
  */
  decrypt(_message: Uint8Array, _senderPublicKey: Uint8Array): Promise<Uint8Array<ArrayBufferLike>>;
  /**
  * This method is used to confirm the user action.
  *
  * @param _message - The message to confirm.
  *
  * @returns `true` if the user action is confirmed, `false` otherwise.
  */
  confirm(_message: string): Promise<boolean>;
  /**
  * This method is used to backup the password context.
  */
  backupUserEncryptionProfile(): Promise<void>;
  /**
  * Gets the public encryption profile.
  *
  * @returns The public encryption profile.
  */
  ensureUserEncryptionProfile(): Promise<PublicEncryptionProfile>;
  /**
  * This method authorizes the origin in case of enclave
  * to use the keys, without user providing the password or MPC again.
  *
  * @returns `true` if the user action is authorized, `false` otherwise.
  */
  guardKeys(): Promise<boolean>;
  /**
  * Filters the credentials based on the private field filters.
  *
  * @param credentials - The credentials to filter.
  * @param privateFieldFilters - The private field filters.
  *
  * @returns The filtered credentials without the content.
  */
  filterCredentials(credentials: idOSCredential[], privateFieldFilters: {
    pick: Record<string, unknown[]>;
    omit: Record<string, unknown[]>;
  }): Promise<idOSCredential[]>;
}
//#endregion
export { BaseProvider, EnclaveOptions, EncryptionPasswordStore, EncryptionPasswordStoresEnum, MPCPasswordContext, PasswordContext, PrivateEncryptionProfile, PublicEncryptionProfile };
//# sourceMappingURL=base-ViJoJtLW.d.ts.map