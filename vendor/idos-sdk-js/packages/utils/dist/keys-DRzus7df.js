import { fromBytesToJson } from "./codecs-Ddj-ztlR.js";
import * as Base64Codec from "@stablelib/base64";
import { negate } from "es-toolkit";
import { every, get } from "es-toolkit/compat";

//#region src/enclave/base.ts
var BaseProvider = class {
	options;
	_signMethod;
	_signMethodType;
	constructor(options) {
		this.options = options;
	}
	/**
	
	* Sets the signer for the enclave.
	
	*
	
	* @param signer - The signer to set, is later used for MPC if allowed.
	
	*/
	setSigner(signer) {
		if (signer.signTypedData) {
			this._signMethod = signer.signTypedData.bind(signer);
			this._signMethodType = "signTypedData";
		} else if (signer.signMessage) {
			this._signMethod = signer.signMessage.bind(signer);
			this._signMethodType = "signMessage";
		} else if (signer.signer) {
			this._signMethod = signer.signer.bind(signer);
			this._signMethodType = "signer";
		} else if (["signMessage", "signer"].some((key) => key in signer)) this._signMethod = signer.signMessage ? signer.signMessage.bind(signer) : signer.signer?.bind(signer);
		else throw new Error("No sign method found in passed signer");
	}
	async signTypedData(domain, types, value) {
		if (!this._signMethod || !this._signMethodType) throw new Error("Signer is not set");
		let signature;
		if (this._signMethodType === "signTypedData") signature = await this._signMethod(domain, types, value);
		else if (this._signMethodType === "signMessage" || this._signMethodType === "signer") {
			const messageString = JSON.stringify(value);
			const response = await this._signMethod(messageString);
			if (typeof response === "string") signature = response;
			else if (response?.result?.signedMessage) signature = response.result.signedMessage;
			else if (response?.signedMessage) signature = response.signedMessage;
			else throw new Error(`Unexpected response format from ${this._signMethodType}: ${JSON.stringify(response)}`);
		} else throw new Error(`Unknown sign method type: ${this._signMethodType}`);
		return signature;
	}
	/**
	
	* Helper method to get the user ID.
	
	*
	
	* @returns The user ID.
	
	*/
	get userId() {
		if (!this.options.userId) throw new Error("User ID is not present");
		return this.options.userId;
	}
	/**
	
	* Resets the enclave (storage etc.)
	
	*/
	async reset() {}
	/**
	
	* Reconfigures the enclave (theme etc).
	
	*
	
	* @param options - The options to reconfigure.
	
	*/
	async reconfigure(options = {}) {
		Object.assign(this.options, options);
	}
	/**
	
	* Loads the enclave (create iframe, open connection, etc.)
	
	*/
	async load() {
		await this.reconfigure();
	}
	/**
	
	* Encrypts a message to a receiver.
	
	* This method also checks if the user is authorized to use the keys.
	
	*
	
	* @param _message - The message to encrypt.
	
	* @param _receiverPublicKey - The public key of the receiver.
	
	*
	
	* @returns The encrypted message.
	
	*/
	async encrypt(_message, _receiverPublicKey) {
		throw new Error("Method 'encrypt' has to be implemented in the subclass.");
	}
	/**
	
	* Decrypts a message from a sender.
	
	* This method also checks if the user is authorized to use the keys.
	
	*
	
	* @param _message - The message to decrypt.
	
	* @param _senderPublicKey - The public key of the sender.
	
	*
	
	* @returns The decrypted message.
	
	*/
	async decrypt(_message, _senderPublicKey) {
		throw new Error("Method 'decrypt' has to be implemented in the subclass.");
	}
	/**
	
	* This method is used to confirm the user action.
	
	*
	
	* @param _message - The message to confirm.
	
	*
	
	* @returns `true` if the user action is confirmed, `false` otherwise.
	
	*/
	async confirm(_message) {
		throw new Error("Method 'confirm' has to be implemented in the subclass.");
	}
	/**
	
	* This method is used to backup the password context.
	
	*/
	async backupUserEncryptionProfile() {
		throw new Error("Method 'backupUserEncryptionProfile' has to be implemented in the subclass.");
	}
	/**
	
	* Gets the public encryption profile.
	
	*
	
	* @returns The public encryption profile.
	
	*/
	async ensureUserEncryptionProfile() {
		throw new Error("Method 'ensureUserEncryptionProfile' has to be implemented in the subclass.");
	}
	/**
	
	* This method authorizes the origin in case of enclave
	
	* to use the keys, without user providing the password or MPC again.
	
	*
	
	* @returns `true` if the user action is authorized, `false` otherwise.
	
	*/
	async guardKeys() {
		return true;
	}
	/**
	
	* Filters the credentials based on the private field filters.
	
	*
	
	* @param credentials - The credentials to filter.
	
	* @param privateFieldFilters - The private field filters.
	
	*
	
	* @returns The filtered credentials without the content.
	
	*/
	async filterCredentials(credentials, privateFieldFilters) {
		const matchCriteria = (content, criteria) => every(Object.entries(criteria), ([path, targetSet]) => targetSet.includes(get(content, path)));
		const decrypted = await Promise.all(credentials.map(async (credential) => ({
			...credential,
			content: await this.decrypt(Base64Codec.decode(credential.content), Base64Codec.decode(credential.encryptor_public_key))
		})));
		return decrypted.map((credential) => ({
			...credential,
			content: (() => {
				try {
					fromBytesToJson(credential.content);
				} catch (_e) {
					throw new Error(`Credential ${credential.id} decrypted contents are not valid JSON`);
				}
			})()
		})).filter(({ content }) => matchCriteria(content, privateFieldFilters.pick)).filter(({ content }) => negate(() => matchCriteria(content, privateFieldFilters.omit))).map((credential) => ({
			...credential,
			content: ""
		}));
	}
	async addAddressMessageToSign(_address, _publicKey, _addressToAddType) {
		throw new Error("Method 'addAddressMessageToSign' has to be implemented in the subclass.");
	}
	async removeAddressMessageToSign(_address, _publicKey, _addressToRemoveType) {
		throw new Error("Method 'removeAddressMessageToSign' has to be implemented in the subclass.");
	}
	async addAddressToMpcSecret(_userId, _message, _signature) {
		throw new Error("Method 'addAddressToMpcSecret' has to be implemented in the subclass.");
	}
	async removeAddressFromMpcSecret(_userId, _message, _signature) {
		throw new Error("Method 'removeAddressFromMpcSecret' has to be implemented in the subclass.");
	}
};

//#endregion
//#region src/enclave/keys.ts
const STORAGE_KEYS = {
	DEPRECATED___ENCRYPTION_PRIVATE_KEY: "encryption-private-key",
	DEPRECATED___ENCRYPTION_SECRET_KEY: "encryption-secret-key",
	OBFUSCATED_BASE64_ENCRYPTION_SECRET_KEY: "obfuscated-base64-encryption-secret-key",
	ENCRYPTION_PUBLIC_KEY: "encryption-public-key",
	DEPRECATED___PASSWORD: "password",
	OBFUSCATED_PASSWORD: "obfuscated-password",
	USER_ID: "user-id",
	ENCRYPTION_PASSWORD_STORE: "encryption-password-store"
};

//#endregion
export { BaseProvider, STORAGE_KEYS };
//# sourceMappingURL=keys-DRzus7df.js.map