import { encode } from "@stablelib/utf8";
import * as Base64Codec from "@stablelib/base64";
import { scrypt } from "scrypt-js";
import nacl from "tweetnacl";

//#region src/encryption/idOSKeyDerivation.ts
const latestVersion = .1;
const allowedVersions = [0, .1];
const uuidv4Regex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const kdfConfig = (version = latestVersion) => {
	if (!allowedVersions.includes(version)) throw new Error("Wrong KDF");
	const versions = {
		0: {
			normalizePassword: (password) => password.normalize("NFKC"),
			validateSalt: (salt) => uuidv4Regex.test(salt),
			n: 128,
			r: 8,
			p: 1,
			dkLen: 32
		},
		.1: {
			normalizePassword: (password) => password.normalize("NFKC"),
			validateSalt: (salt) => uuidv4Regex.test(salt),
			n: 16384,
			r: 8,
			p: 1,
			dkLen: 32
		}
	};
	return versions[version];
};
const idOSKeyDerivation = async ({ password, salt, version = latestVersion }) => {
	const { validateSalt, normalizePassword, n, r, p, dkLen } = kdfConfig(version);
	if (!validateSalt(salt)) throw new Error("Invalid salt");
	password = normalizePassword(password);
	const passwordBytes = encode(password);
	const saltBytes = encode(salt);
	return scrypt(passwordBytes, saltBytes, n, r, p, dkLen);
};

//#endregion
//#region src/encryption/index.ts
function keyDerivation(password, salt) {
	return idOSKeyDerivation({
		password,
		salt
	});
}
function encrypt(message, publicKey, receiverPublicKey) {
	const nonce = nacl.randomBytes(nacl.box.nonceLength);
	const ephemeralKeyPair = nacl.box.keyPair();
	const encrypted = nacl.box(message, nonce, receiverPublicKey, ephemeralKeyPair.secretKey);
	if (encrypted === null) throw Error(`Couldn't encrypt. ${JSON.stringify({
		message: Base64Codec.encode(message),
		nonce: Base64Codec.encode(nonce),
		receiverPublicKey: Base64Codec.encode(receiverPublicKey),
		localPublicKey: Base64Codec.encode(publicKey)
	}, null, 2)}`);
	const fullMessage = new Uint8Array(nonce.length + encrypted.length);
	fullMessage.set(nonce, 0);
	fullMessage.set(encrypted, nonce.length);
	return {
		content: fullMessage,
		encryptorPublicKey: ephemeralKeyPair.publicKey
	};
}
async function decrypt(fullMessage, keyPair, senderPublicKey) {
	const nonce = fullMessage.slice(0, nacl.box.nonceLength);
	const message = fullMessage.slice(nacl.box.nonceLength, fullMessage.length);
	const decrypted = nacl.box.open(message, nonce, senderPublicKey, keyPair.secretKey);
	if (decrypted === null) throw Error(`Couldn't decrypt. ${JSON.stringify({
		fullMessage: Base64Codec.encode(fullMessage),
		message: Base64Codec.encode(message),
		nonce: Base64Codec.encode(nonce),
		senderPublicKey: Base64Codec.encode(senderPublicKey),
		localPublicKey: Base64Codec.encode(keyPair.publicKey)
	}, null, 2)}`);
	return decrypted;
}

//#endregion
export { decrypt, encrypt, keyDerivation };
//# sourceMappingURL=encryption-BHOssWvX.js.map