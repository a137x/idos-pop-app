import * as Hex$1 from "@stablelib/hex";
import * as Hex from "@stablelib/hex";
import * as Utf8$1 from "@stablelib/utf8";
import * as Utf8 from "@stablelib/utf8";
import { Client, Wallet, decodeAccountID } from "xrpl";

//#region src/xrpl-credentials/accept.ts
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
function OriginalCredentialAcceptPayload(issuerAddress, accountAddress, credentialType) {
	const encodedCredentialType = Hex$1.encode(Utf8$1.encode(credentialType));
	return {
		TransactionType: "CredentialAccept",
		Issuer: issuerAddress,
		Account: accountAddress,
		CredentialType: encodedCredentialType
	};
}
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
function CopyCredentialAcceptPayload(copyCredentialIssuerAddress, accountAddress, originalCredentialIssuerAddress, credentialType, timelockYears) {
	if (!Number.isInteger(timelockYears) || timelockYears < 0) throw new Error("timelockYears must be a non-negative integer");
	const type = Buffer.concat([
		Utf8$1.encode("AG"),
		Utf8$1.encode("-"),
		Utf8$1.encode(credentialType),
		Utf8$1.encode("-"),
		decodeAccountID(originalCredentialIssuerAddress),
		Utf8$1.encode("-"),
		Utf8$1.encode(`${timelockYears}Y`)
	]);
	return {
		TransactionType: "CredentialAccept",
		Issuer: copyCredentialIssuerAddress,
		Account: accountAddress,
		CredentialType: Hex$1.encode(type)
	};
}

//#endregion
//#region src/xrpl-credentials/create.ts
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
var XrplCredentialsCreate = class {
	#client;
	#wallet;
	/**
	* Creates a new XRPL credentials service instance.
	*
	* @param nodeUrl - The WebSocket URL of the XRPL node to connect to
	* @param seed  - The XRPL wallet seed to use for signing transactions
	*/
	constructor(nodeUrl, seed) {
		this.#client = new Client(nodeUrl);
		this.#wallet = Wallet.fromSeed(seed);
	}
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
	async createCredentialForOriginal(params) {
		const { credId, credType, userAddress } = params;
		await this.#client.connect();
		const res = await this.#client.submitAndWait({
			TransactionType: "CredentialCreate",
			Account: this.#wallet.address,
			Subject: userAddress,
			CredentialType: Hex.encode(Utf8.encode(credType)),
			URI: Hex.encode(Buffer.from(credId))
		}, { wallet: this.#wallet });
		await this.#client.disconnect();
		return res;
	}
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
	async createCredentialForCopy(params) {
		const { credId, credType, userAddress, timelockYears, origCredIssuerAddress } = params;
		if (!Number.isInteger(timelockYears) || timelockYears < 0) throw new Error("timelockYears must be a non-negative integer");
		await this.#client.connect();
		const type = Buffer.concat([
			Utf8.encode("AG"),
			Utf8.encode("-"),
			Utf8.encode(credType),
			Utf8.encode("-"),
			decodeAccountID(origCredIssuerAddress),
			Utf8.encode("-"),
			Utf8.encode(`${timelockYears}Y`)
		]);
		const res = await this.#client.submitAndWait({
			TransactionType: "CredentialCreate",
			Account: this.#wallet.address,
			Subject: userAddress,
			CredentialType: Hex.encode(type),
			URI: Hex.encode(Buffer.from(credId))
		}, { wallet: this.#wallet });
		await this.#client.disconnect();
		return res;
	}
};

//#endregion
export { CopyCredentialAcceptPayload, OriginalCredentialAcceptPayload, XrplCredentialsCreate };
//# sourceMappingURL=index.js.map