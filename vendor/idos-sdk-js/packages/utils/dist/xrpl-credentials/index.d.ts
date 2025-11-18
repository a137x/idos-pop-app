//#region src/xrpl-credentials/accept.d.ts
/**
* Payload structure for XRPL CredentialAccept transaction
*
* This type defines the required fields for creating a credential acceptance
* transaction on the XRP Ledger. The CredentialType field is automatically
* encoded as a hex string from the UTF-8 representation of the credential type.
*/
type CredentialAcceptPayload = {
  /** Transaction type identifier - must be "CredentialAccept" */
  TransactionType: "CredentialAccept";
  /** The issuer's XRPL address who created the Credential object */
  Issuer: string;
  /** The account's XRPL address who is receiving the credential */
  Account: string;
  /** The type of credential being accepted (encoded as hex string) */
  CredentialType: string;
};
/**
* Creates a credential acceptance payload for XRPL transactions
*
* This function constructs a properly formatted payload for credential acceptance
* transactions. The credential type is automatically encoded from UTF-8 to hex
* format as required by XRPL specifications.
*
* @param issuerAddress - The XRPL address of the credential issuer
* @param accountAddress - The XRPL address of the account accepting the credential
* @param credentialType - The human-readable idOS credential type (e.g., "KYC")
* @returns A properly formatted CredentialAcceptPayload object
*
* @example
* ```typescript
* const payload = OriginalCredentialAcceptPayload(
*   "rIssuerAddress123...",
*   "rAccountAddress456...",
*   "KYC"
* );
* // Result: {
* //   TransactionType: "CredentialAccept",
* //   Issuer: "rIssuerAddress123...",
* //   Account: "rAccountAddress456...",
* //   CredentialType: "4B5943" // Hex encoded "KYC"
* // }
* ```
*/
declare function OriginalCredentialAcceptPayload(issuerAddress: string, accountAddress: string, credentialType: string): CredentialAcceptPayload;
/**
* Creates a copy credential acceptance payload for XRPL transactions
*
* This function constructs a payload for accepting a copy of an existing credential
* with additional metadata including the original issuer and a timelock period.
* The CredentialType field is encoded as a composite string containing:
* - "AG-" prefix (indicating copy credential)
* - Original credential type
* - Original issuer address
* - Timelock period in years
*
* @param copyCredentialIssuerAddress - The XRPL address of the issuer created a XRPL Credential object related to idOS credential copy
* @param accountAddress - The XRPL address of the account accepting the credential copy
* @param originalCredentialIssuerAddress - The XRPL address of the issuer created a XRPL Credential object related to idOS original credential
* @param credentialType - The human-readable idOScredential type (e.g., "KYC")
* @param timelockYears - The number of years for the timelock period (must be non-negative integer)
* @returns A properly formatted CredentialAcceptPayload object for copy credentials
* @throws {Error} When timelockYears is not a non-negative integer
*
* @example
* ```typescript
* const payload = CopyCredentialAcceptPayload(
*   "rCopyIssuerAddress123...",
*   "rAccountAddress456...",
*   "rOriginalIssuerAddress789...",
*   "KYC",
*   2
* );
* // Result: {
* //   TransactionType: "CredentialAccept",
* //   Issuer: "rCopyIssuerAddress123...",
* //   Account: "rAccountAddress456...",
* //   CredentialType: "41472D4B59432D..." // Hex encoded "AG-KYC-{originalIssuer}-2Y"
* // }
* ```
*/
declare function CopyCredentialAcceptPayload(copyCredentialIssuerAddress: string, accountAddress: string, originalCredentialIssuerAddress: string, credentialType: string, timelockYears: number): CredentialAcceptPayload;
//#endregion
//#region src/xrpl-credentials/create.d.ts
/**
* Parameters for creating an original credential on XRPL
*/
type CreateCredentialForOriginalParams = {
  /** Unique identifier for the idOS credential, like `741a9caf-ec53-42c7-aed6-519950dcded5` */
  credId: string;
  /** Type/category of the credential, like `KYC` */
  credType: string;
  /** XRPL address of the user receiving the credential, like `rPT1Sjq2YGrBMTttX4GZHjKu9dyf6bpAYe` */
  userAddress: string;
};
/**
* Parameters for creating a time-locked copy credential on XRPL
*/
type CreateCredentialForCopyParams = {
  /** Unique identifier for the idOS credential */
  credId: string;
  /** Type/category of the credential */
  credType: string;
  /** XRPL address of the user receiving the credential */
  userAddress: string;
  /** Number of years to lock the credential (must be non-negative integer) */
  timelockYears: number;
  /** XRPL address of the original credential issuer */
  origCredIssuerAddress: string;
};
/**
* Service class for creating credentials on the XRPL blockchain
*
* This service provides methods to create both original and copy credentials
* on the XRPL. It handles connection management, transaction submission,
* and proper encoding of credential data according to XRPL specifications.
*
* @example
* ```typescript
* const wallet = Wallet.fromSeed("s...");
* const xrplService = new XrplCredentialsCreate("wss://s.devnet.rippletest.net:51233", wallet);
*
* // Create original credential
* await xrplService.createCredentialForOriginal({
*   credId: "741a9caf-ec53-42c7-aed6-519950dcded5",
*   credType: "KYC",
*   userAddress: "rPT1Sjq2YGrBMTttX4GZHjKu9dyf6bpAYe"
* });
* ```
*/
declare class XrplCredentialsCreate {
  #private;
  /**
  * Creates a new XRPL credentials service instance.
  *
  * @param nodeUrl - The WebSocket URL of the XRPL node to connect to
  * @param seed  - The XRPL wallet seed to use for signing transactions
  */
  constructor(nodeUrl: string, seed: string);
  /**
  * Creates a credential on the XRPL that reflects an idOS original credential.
  *
  * This method creates a new credential with the specified type and assigns it to the given user.
  * The credential type is encoded as a hex string, and the credential ID is encoded as a hex URI.
  *
  * @param params - Parameters for creating the original credential
  * @returns Promise resolving to the XRPL transaction result
  *
  * @example
  * ```typescript
  * await xrplService.createCredentialForOriginal({
  *   credId: "741a9caf-ec53-42c7-aed6-519950dcded5",
  *   credType: "KYC",
  *   userAddress: "rPT1Sjq2YGrBMTttX4GZHjKu9dyf6bpAYe"
  * });
  * ```
  */
  createCredentialForOriginal(params: CreateCredentialForOriginalParams): Promise<any>;
  /**
  * Creates a time-locked credential copy on the XRPL.
  *
  * This method creates a Credential object in XRPL that reflects an idOS credential copy.
  * The credential type includes metadata about the original issuer and time-lock duration.
  * The composite credential type follows the format: "AG-{type}-{originalIssuer}-{timelock}Y"
  *
  * @param params - Parameters for creating the time-locked credential copy
  * @returns Promise resolving to the XRPL transaction result
  *
  * @throws {Error} When timelockYears is not a non-negative integer
  *
  * @example
  * ```typescript
  * const result = await xrplService.createCredentialForCopy({
  *   credId: "741a9caf-ec53-42c7-aed6-519950dcded5",
  *   credType: "KYC",
  *   userAddress: "rPT1Sjq2YGrBMTttX4GZHjKu9dyf6bpAYe",
  *   timelockYears: 5,
  *   origCredIssuerAddress: "rU9C67bZ3ZvjXaJYwYqMqjMq1o4ZbwK3YN"
  * });
  * ```
  */
  createCredentialForCopy(params: CreateCredentialForCopyParams): Promise<any>;
}
//#endregion
export { CopyCredentialAcceptPayload, CreateCredentialForCopyParams, CreateCredentialForOriginalParams, CredentialAcceptPayload, OriginalCredentialAcceptPayload, XrplCredentialsCreate };
//# sourceMappingURL=index.d.ts.map