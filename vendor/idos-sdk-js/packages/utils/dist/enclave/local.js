import { base64Encode, utf8Decode } from "../codecs-Ddj-ztlR.js";
import { BaseProvider, STORAGE_KEYS } from "../keys-BYTM9ukg.js";
import { decrypt, encrypt, keyDerivation } from "../encryption-Dn-cOOz5.js";
import { LocalStorageStore } from "../store-CJsdFslr.js";
import * as Base64Codec from "@stablelib/base64";
import nacl from "tweetnacl";
import { ChainControllerApi, Configuration } from "@partisiablockchain/blockchain-api-transaction-client";
import { ethers } from "ethers";
import { AbiByteInput } from "@partisiablockchain/abi-client";

//#region src/mpc/api.ts
const postHeaders = {
	Accept: "application/json, text/plain, */*",
	"Content-Type": "application/json"
};
function buildOptions(method, headers, entityBytes) {
	const result = {
		method,
		headers,
		body: null
	};
	if (entityBytes != null) result.body = JSON.stringify(entityBytes);
	return result;
}
/**
* Make a http put-request.
*
* @param url the url to request.
* @param object the object to put.
* @param headers
* @return a promise containing whether the put succeeded or not.
*/
function putRequest(url, object, headers) {
	const options = buildOptions("PUT", {
		...postHeaders,
		...headers
	}, object);
	return fetch(url, options).then(async (response) => {
		return response.status.toString();
	}).catch((error) => {
		console.error(error);
		return error;
	});
}
/**
* Make a http patch-request.
*
* @param url the url to request.
* @param object the object to put.
* @param headers
* @return a promise containing whether the put succeeded or not.
*/
function patchRequest(url, object, headers) {
	const options = buildOptions("PATCH", {
		...postHeaders,
		...headers
	}, object);
	return fetch(url, options).then(async (response) => response.ok).catch(() => false);
}
/**
* Make a http post-request.
*
* @param url the url to request.
* @param object the object to post.
* @param headers
* @return a promise containing the result of the post request.
*/
function postRequest(url, object, headers) {
	const options = buildOptions("POST", {
		...postHeaders,
		...headers
	}, object);
	return handleFetch(fetch(url, options));
}
function handleFetch(promise) {
	return promise.then(async (response) => {
		if (response.status === 200) {
			const data = await response.json();
			return {
				status: response.status.toString(),
				body: data
			};
		}
		return {
			status: response.status.toString(),
			body: void 0
		};
	}).catch((error) => {
		console.error(error);
		return {
			status: "fetch-error",
			body: void 0
		};
	});
}

//#endregion
//#region src/mpc/engine-client.ts
var EngineClient = class {
	baseUrl;
	contractAddress;
	constructor(baseUrl, contractAddress) {
		this.contractAddress = contractAddress;
		this.baseUrl = baseUrl;
	}
	async sendUpload(id, uploadRequest, signature) {
		const authHeader = { Authorization: `eip712 ${signature}` };
		const url = `${this.baseUrl}/offchain/${this.contractAddress}/shares/${id}`;
		const status = await putRequest(url, uploadRequest, authHeader);
		if (status !== "201") throw new Error(`Error uploading share to ${this.contractAddress} at ${url}`);
		return status;
	}
	async sendDownload(id, downloadRequest, signature) {
		const authHeader = { Authorization: `eip712 ${signature}` };
		const url = `${this.baseUrl}/offchain/${this.contractAddress}/shares/${id}`;
		return await postRequest(url, downloadRequest, authHeader);
	}
	async downloadAndDecrypt(id, downloadRequest, signature, secretKey) {
		const { status, body: encryptedShare } = await this.sendDownload(id, downloadRequest, signature);
		if (encryptedShare === void 0) return {
			share: void 0,
			status
		};
		const encryptedBuffer = ethers.getBytes(encryptedShare.encrypted_share);
		const publicKeyBuffer = ethers.getBytes(encryptedShare.public_key);
		const nonceBuffer = ethers.getBytes(encryptedShare.nonce);
		const open = nacl.box.open(encryptedBuffer, nonceBuffer, publicKeyBuffer, secretKey);
		if (open == null) return {
			share: void 0,
			status: "box-open-error"
		};
		return {
			share: Buffer.from(open.subarray(32)),
			status
		};
	}
	async sendUpdate(id, updateRequest, signature) {
		const authHeader = { Authorization: `eip712 ${signature}` };
		const url = `${this.baseUrl}/offchain/${this.contractAddress}/shares/${id}`;
		const ok = await patchRequest(url, updateRequest, authHeader);
		if (!ok) throw new Error(`Error updating wallets to ${this.contractAddress} at ${url}`);
	}
};

//#endregion
//#region src/mpc/generated/IdosContract.ts
var IdosContract = class {
	_client;
	_address;
	constructor(client, address) {
		this._address = address;
		this._client = client;
	}
	deserializeContractState(_input) {
		const nodes_vecLength = _input.readI32();
		const nodes = [];
		for (let nodes_i = 0; nodes_i < nodes_vecLength; nodes_i++) {
			const nodes_elem = this.deserializeNodeConfig(_input);
			nodes.push(nodes_elem);
		}
		return { nodes };
	}
	deserializeNodeConfig(_input) {
		const address = _input.readAddress();
		const endpoint = _input.readString();
		return {
			address,
			endpoint
		};
	}
	async getState() {
		const bytes = await this._client?.getContractStateBinary(this._address);
		if (bytes === void 0) throw new Error("Unable to get state bytes");
		const input = AbiByteInput.createLittleEndian(bytes);
		return this.deserializeContractState(input);
	}
};
function deserializeState(state, client, address) {
	if (Buffer.isBuffer(state)) {
		const input$1 = AbiByteInput.createLittleEndian(state);
		return new IdosContract(client, address).deserializeContractState(input$1);
	}
	const input = AbiByteInput.createLittleEndian(state.bytes);
	return new IdosContract(state.client, state.address).deserializeContractState(input);
}

//#endregion
//#region src/mpc/secretsharing/polynomial.ts
/** Polynomials with coefficients in a finite field. */
var Polynomial = class Polynomial {
	coefficients;
	constructor(coefficients) {
		this.coefficients = coefficients;
	}
	/**
	* Construct a polynomial from a set of coefficients. The degree of the resultant polynomial is
	* assumed to be equal to the number of coefficients minus 1. The constant term of the polynomial
	* is assumed to be stored in the first position of the coefficients.
	*
	* @param coefficients the coefficients of the polynomial
	* @param zero zero element of the field
	* @return the constructed polynomial
	*/
	static create(coefficients, zero) {
		return new Polynomial(Polynomial.filterHighZeroes(coefficients, zero));
	}
	static filterHighZeroes(coefficients, zero) {
		for (let i = coefficients.length - 1; i >= 0; i--) if (!coefficients[i].isZero()) return coefficients.slice(0, i + 1);
		return [zero];
	}
	/**
	* Returns the coefficients of the polynomial.
	*
	* @return the coefficients of the polynomial
	*/
	getCoefficients() {
		return this.coefficients.slice();
	}
	/**
	* Returns the degree of this polynomial.
	*
	* @return the degree of the polynomial
	*/
	degree() {
		return this.coefficients.length - 1;
	}
	/**
	* Returns the constant term of the polynomial.
	*
	* @return the term stored on position 0 of the coefficients of this polynomial
	*/
	getConstantTerm() {
		return this.coefficients[0];
	}
	/**
	* Evaluates this polynomial on a point. That is, if F is the polynomial and x a value, then this
	* method returns F(x).
	*
	* @param point the point to evaluate this polynomial on
	* @return F(point) where F is this polynomial
	*/
	evaluate(point) {
		const degree = this.degree();
		let result = this.coefficients[degree];
		for (let i = degree - 1; i >= 0; --i) {
			const current = this.coefficients[i];
			result = current.add(point.multiply(result));
		}
		return result;
	}
};

//#endregion
//#region src/mpc/secretsharing/f256.ts
var F256 = class F256 {
	value;
	constructor(value) {
		this.value = value;
	}
	/**
	* The zero element.
	*/
	static ZERO = F256.createElement(0);
	/**
	* The one element.
	*/
	static ONE = F256.createElement(1);
	/**
	* Create a new field element with the given value.
	* @param value the value
	*/
	static createElement(value) {
		return new F256(value & 255);
	}
	/**
	* Get the computation alphas for this field.
	* @returns the computation alphas
	*/
	static computationAlphas() {
		return Constants.computationAlphas;
	}
	/**
	* Create a polynomial.
	* @param coefficients the coefficients of the polynomial
	*/
	static createPoly(coefficients) {
		return Polynomial.create(coefficients, F256.ZERO);
	}
	add(other) {
		return Constants.elements[this.value ^ other.value];
	}
	isEqualTo(other) {
		return this.value === other.value;
	}
	isOne() {
		return this.value === 1;
	}
	isZero() {
		return this.value === 0;
	}
	modInverse() {
		return Constants.elements[Constants.multiplicativeInverse[this.value]];
	}
	multiply(other) {
		let a = this.value;
		let b = other.value;
		let m;
		let p = 0;
		for (let i = 0; i < 8; i++) {
			p = (p ^ -(b & 1) & a) & 255;
			m = -(a >> 7 & 1) & 255;
			a = (a << 1 ^ 283 & m) & 255;
			b = b >> 1;
		}
		return Constants.elements[p];
	}
	negate() {
		return this;
	}
	squareRoot() {
		throw new Error("Not implemented");
	}
	subtract(other) {
		return this.add(other);
	}
};
const Constants = {
	elements: Array.from({ length: 256 }, (_value, key) => F256.createElement(key)),
	computationAlphas: [
		F256.createElement(1),
		F256.createElement(2),
		F256.createElement(3),
		F256.createElement(4),
		F256.createElement(5)
	],
	multiplicativeInverse: [
		0,
		1,
		141,
		246,
		203,
		82,
		123,
		209,
		232,
		79,
		41,
		192,
		176,
		225,
		229,
		199,
		116,
		180,
		170,
		75,
		153,
		43,
		96,
		95,
		88,
		63,
		253,
		204,
		255,
		64,
		238,
		178,
		58,
		110,
		90,
		241,
		85,
		77,
		168,
		201,
		193,
		10,
		152,
		21,
		48,
		68,
		162,
		194,
		44,
		69,
		146,
		108,
		243,
		57,
		102,
		66,
		242,
		53,
		32,
		111,
		119,
		187,
		89,
		25,
		29,
		254,
		55,
		103,
		45,
		49,
		245,
		105,
		167,
		100,
		171,
		19,
		84,
		37,
		233,
		9,
		237,
		92,
		5,
		202,
		76,
		36,
		135,
		191,
		24,
		62,
		34,
		240,
		81,
		236,
		97,
		23,
		22,
		94,
		175,
		211,
		73,
		166,
		54,
		67,
		244,
		71,
		145,
		223,
		51,
		147,
		33,
		59,
		121,
		183,
		151,
		133,
		16,
		181,
		186,
		60,
		182,
		112,
		208,
		6,
		161,
		250,
		129,
		130,
		131,
		126,
		127,
		128,
		150,
		115,
		190,
		86,
		155,
		158,
		149,
		217,
		247,
		2,
		185,
		164,
		222,
		106,
		50,
		109,
		216,
		138,
		132,
		114,
		42,
		20,
		159,
		136,
		249,
		220,
		137,
		154,
		251,
		124,
		46,
		195,
		143,
		184,
		101,
		72,
		38,
		200,
		18,
		74,
		206,
		231,
		210,
		98,
		12,
		224,
		31,
		239,
		17,
		117,
		120,
		113,
		165,
		142,
		118,
		61,
		189,
		188,
		134,
		87,
		11,
		40,
		47,
		163,
		218,
		212,
		228,
		15,
		169,
		39,
		83,
		4,
		27,
		252,
		172,
		230,
		122,
		7,
		174,
		99,
		197,
		219,
		226,
		234,
		148,
		139,
		196,
		213,
		157,
		248,
		144,
		107,
		177,
		13,
		214,
		235,
		198,
		14,
		207,
		173,
		8,
		78,
		215,
		227,
		93,
		80,
		30,
		179,
		91,
		35,
		56,
		52,
		104,
		70,
		3,
		140,
		221,
		156,
		125,
		160,
		205,
		26,
		65,
		28
	]
};

//#endregion
//#region src/mpc/secretsharing/lagrange.ts
/**
* Try to interpolate a polynomial that passes through the supplied points.
*
* @param xs x-coordinates in the points
* @param ys y-coordinates in the points
* @param zero 0 element in the Finite Field.
* @param one 1 element in the Finite Field.
*
* @returns the interpolated polynomial or null if unable to interpolate
*/
function interpolate(xs, ys, zero, one) {
	if (xs.length !== ys.length) throw new Error("xs and ys must be of same size");
	if (xs.length === 0) throw new Error("xs and ys must have at least one element");
	const n = xs.length;
	const c = Array(n).fill(one);
	c[0] = one;
	for (let i = 0; i < n; i++) {
		for (let j = i; j > 0; j--) c[j] = c[j - 1].subtract(c[j].multiply(xs[i]));
		c[0] = c[0].multiply(xs[i].negate());
	}
	const coefficients = Array(n).fill(zero);
	const tc = Array(n).fill(zero);
	tc[n - 1] = one;
	for (let i = 0; i < n; i++) {
		let denominator = one;
		for (let j = 0; j < n; j++) if (i !== j) denominator = denominator.multiply(xs[i].subtract(xs[j]));
		const t = ys[i].multiply(denominator.modInverse());
		coefficients[n - 1] = coefficients[n - 1].add(t.multiply(tc[n - 1]));
		for (let j = n - 2; j >= 0; j--) {
			tc[j] = c[j + 1].add(tc[j + 1].multiply(xs[i]));
			coefficients[j] = coefficients[j].add(t.multiply(tc[j]));
		}
	}
	return Polynomial.create(coefficients, zero);
}
/**
* Interpolate the minimal polynomial that passes through all the supplied points. And verify that
* the polynomial has a degree less that maximalDegree.
*
* @param xs x-coordinates in the points
* @param ys y-coordinates in the points
* @param zero 0 element in the Finite Field.
* @param one 1 element in the Finite Field.
* @param maximalDegree the expected maximal degree
* @return the interpolated polynomial
*/
function interpolateCheckDegree(xs, ys, maximalDegree, zero, one) {
	const poly = interpolate(xs, ys, zero, one);
	if (poly.degree() > maximalDegree) throw new Error(`Interpolated polynomial has too high degree. Expected maximal=${maximalDegree}, actual=${poly.degree()}`);
	return poly;
}
/**
* Utility for lagrange interpolation.
*/
const Lagrange = {
	interpolate,
	interpolateCheckDegree
};

//#endregion
//#region src/mpc/secretsharing/binary-secret-shares.ts
/**
* Binary data which has been broken into secret shares. BinarySecretShares are distributed among ZK
* nodes when inputting a secret variable, and received from ZK nodes when reconstructing a secret
* variable.
*/
var BinarySecretShares = class BinarySecretShares {
	secretShares;
	static ALPHAS = F256.computationAlphas();
	/**
	* Constructs secret shares from a list of shares. The list contains a share for each
	* sending/receiving party of the secret data.
	*
	* @param secretShares the list of shares
	*/
	constructor(secretShares) {
		this.secretShares = secretShares;
	}
	/**
	* Creates binary secret shares from binary secret data. For each secret byte a random polynomial
	* of degree 1 is created with the secret byte embedded as the constant term. To create each share
	* of the byte the polynomial is evaluated at a point.
	*
	* @param variableData binary secret variable data to create the secret shares from
	* @param rng randomness generator used to generate random polynomials
	* @return the created shares.
	*/
	static create(variableData, rng) {
		const random = rng ?? getRandomBytes;
		const sharedElements = [];
		for (let i = 0; i < BinarySecretShares.ALPHAS.length; i++) sharedElements.push([]);
		for (let i = 0; i < variableData.length; i++) {
			const secret = F256.createElement(variableData[i]);
			const polynomial = BinarySecretShares.generatePolynomial(secret, random);
			for (let j = 0; j < BinarySecretShares.ALPHAS.length; j++) {
				const share = polynomial.evaluate(BinarySecretShares.ALPHAS[j]);
				sharedElements[j].push(share);
			}
		}
		return new BinarySecretShares(sharedElements.map((s) => new Share(s)));
	}
	/**
	* Create binary secret shares from bytes read from ZK nodes.
	*
	* @param rawShares list of raw shares read from ZK nodes
	* @return the created shares
	*/
	static read(rawShares) {
		if (rawShares.filter((x) => x !== void 0).length < 3) throw new Error("Not enough shares to reconstruct");
		const readShares = rawShares.map((s) => s === void 0 ? void 0 : Share.read(s));
		return new BinarySecretShares(readShares);
	}
	/**
	* Generates a random polynomial of degree 2:
	*
	* <p><i>f(x)= secret + random1*x + random2*x</i>
	*
	* <p>such that f(0) match the provided secret.
	*
	* @param secret the secret to be embedded in the constant term
	* @param rng randomness generator used to generate random byte
	* @return a random polynomial generated with the secret and a random number as coefficients.
	*/
	static generatePolynomial(secret, rng) {
		const randomByte1 = rng(1)[0];
		const randomByte2 = rng(1)[0];
		const random1 = F256.createElement(randomByte1);
		const random2 = F256.createElement(randomByte2);
		return F256.createPoly([
			secret,
			random1,
			random2
		]);
	}
	getShares() {
		return this.secretShares.map((share) => share.serialize());
	}
	/**
	* Reconstruct the secret variable data from these BinarySecretShares. First the shares of each
	* byte of the secret variable data is grouped. Then, a polynomial is interpolated from the shares
	* of each byte. The constant term of this polynomial is the value of the secret byte. Lastly, the
	* secret bytes are collected in a byte array to form the secret variable data.
	*
	* @return the reconstructed binary secret variable data
	*/
	reconstructSecret() {
		const result = [];
		for (let i = 0; i < this.getByteLength(); i++) result.push(this.reconstructSecretByte(i));
		return Buffer.from(result);
	}
	/**
	* Reconstructs one byte of the secret variable data which these binary secret shares constitute. A
	* polynomial is interpolated from the shares of the byte, and the constant term of this polynomial
	* is returned as the reconstructed byte.
	*
	* @param i index of the byte to reconstruct
	* @return the reconstructed byte
	*/
	reconstructSecretByte(i) {
		const alphas = [];
		const sharesOfByte = [];
		const possibleUndefined = this.secretShares.map((share) => share?.byteElements[i]);
		for (let j = 0; j < possibleUndefined.length; j++) {
			const possibleUndefinedElement = possibleUndefined[j];
			if (possibleUndefinedElement !== void 0) {
				alphas.push(BinarySecretShares.ALPHAS[j]);
				sharesOfByte.push(possibleUndefinedElement);
			}
		}
		const polynomial = Lagrange.interpolateCheckDegree(alphas, sharesOfByte, 2, F256.ZERO, F256.ONE);
		return polynomial.getConstantTerm().value;
	}
	getByteLength() {
		return this.secretShares.filter((x) => x !== void 0)[0].byteElements.length;
	}
	/**
	* Returns the amount of shares.
	*
	* @return the size of the share list
	*/
	noOfShares() {
		return this.secretShares.length;
	}
};
/**
* Secret shares are disjoint parts of a secret input. A secret share consists of a list of
* F256s which are in turn secret shares of a single byte.
*/
var Share = class Share {
	byteElements;
	/**
	* Constructs a secret share from a list of byte elements.
	*
	* @param byteElements the byte elements that constitutes the share
	*/
	constructor(byteElements) {
		this.byteElements = byteElements;
	}
	/**
	* Read a binary share from a stream, in the format specified by the ZK nodes. This is used when
	* shares are fetched from ZK nodes during reconstruction of a secret variable.
	*
	* @param shareBytes the buffer to read the share from
	* @return the read share
	*/
	static read(shareBytes) {
		const sharesOfBytes = [];
		for (let i = 0; i < shareBytes.length; i++) {
			const shareOfByte = F256.createElement(shareBytes[i]);
			sharesOfBytes.push(shareOfByte);
		}
		return new Share(sharesOfBytes);
	}
	/**
	* Serializes each byte element of the share.
	*
	* @return the serialized share
	*/
	serialize() {
		return Buffer.from(this.byteElements.map((b) => b.value));
	}
	isEqualTo(that) {
		if (that.byteElements.length !== this.byteElements.length) return false;
		for (let i = 0; i < this.byteElements.length; i++) if (!that.byteElements[i].isEqualTo(this.byteElements[i])) return false;
		return true;
	}
};
function getRandomBytes(length) {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Buffer.from(array);
}

//#endregion
//#region src/mpc/types.ts
const UPLOAD_TYPES = { UploadSignatureMessage: [{
	name: "share_commitments",
	type: "bytes32[]"
}, {
	name: "recovering_addresses",
	type: "address[]"
}] };
const DOWNLOAD_TYPES = { DownloadSignatureMessage: [
	{
		name: "recovering_address",
		type: "address"
	},
	{
		name: "timestamp",
		type: "uint64"
	},
	{
		name: "public_key",
		type: "bytes32"
	}
] };

//#endregion
//#region src/mpc/client.ts
var Client = class Client {
	baseUrl;
	contractAddress;
	engines;
	constructor(baseUrl, contractAddress) {
		this.baseUrl = baseUrl;
		this.contractAddress = contractAddress;
	}
	async uploadSecret(id, uploadSignature, signature, blindedShares) {
		const engineClients = await this.getEngines();
		console.log(engineClients);
		const promises = [];
		for (let i = 0; i < engineClients.length; i++) {
			const engineClient = engineClients[i];
			const uploadRequest = {
				...uploadSignature,
				share_data: ethers.hexlify(blindedShares[i])
			};
			promises.push(engineClient.sendUpload(id, uploadRequest, signature));
		}
		const statuses = await Promise.all(promises);
		if (statuses.every((item) => item === "201")) return { status: "success" };
		if (statuses.filter((item) => item === "201").length > 0) return { status: "partial-success" };
		return { status: "failure" };
	}
	getBlindedShares(secret) {
		const shares = BinarySecretShares.create(secret).getShares();
		return shares.map((b) => Client.blindShare(b));
	}
	uploadMessageToSign(uploadRequest) {
		return {
			domain: this.getTypedDomain(),
			types: UPLOAD_TYPES,
			value: uploadRequest
		};
	}
	uploadRequest(blindedShares, signerAddress, additionalRecoveringAddresses = []) {
		const recoveringAddresses = [signerAddress, ...additionalRecoveringAddresses];
		return {
			share_commitments: blindedShares.map((b) => ethers.keccak256(b)),
			recovering_addresses: recoveringAddresses
		};
	}
	downloadMessageToSign(downloadRequest) {
		return {
			domain: this.getTypedDomain(),
			types: DOWNLOAD_TYPES,
			value: downloadRequest
		};
	}
	downloadRequest(signerAddress, publicKey) {
		return {
			recovering_address: signerAddress,
			timestamp: Date.now(),
			public_key: ethers.hexlify(publicKey)
		};
	}
	async downloadSecret(id, downloadRequest, signature, secretKey) {
		const shares = [];
		const engineClients = await this.getEngines();
		for (let i = 0; i < engineClients.length; i++) {
			const engineClient = engineClients[i];
			shares.push(engineClient.downloadAndDecrypt(id, downloadRequest, signature, secretKey));
		}
		const secretShares = await Promise.all(shares);
		console.log({ secretSharesDownloadStatuses: secretShares.map((item) => item.status) });
		if (secretShares.every((item) => item.status === "404")) return {
			status: "not-stored",
			secret: void 0
		};
		var secret;
		try {
			secret = BinarySecretShares.read(secretShares.map((item) => item.share)).reconstructSecret();
			return {
				status: "ok",
				secret
			};
		} catch (_e) {
			return {
				status: "error",
				secret: void 0
			};
		}
	}
	getTypedDomain() {
		return {
			name: "idOS secret store contract",
			version: "1",
			verifyingContract: `0x${this.contractAddress.substring(2)}`
		};
	}
	async getEngines() {
		if (this.engines === void 0) {
			const chainController = new ChainControllerApi(new Configuration({ basePath: this.baseUrl }));
			const rawState = await chainController.getContract({ address: this.contractAddress });
			const state = deserializeState(Buffer.from(rawState.serializedContract, "base64"));
			this.engines = state.nodes.map((value) => new EngineClient(value.endpoint, this.contractAddress));
		}
		return this.engines;
	}
	static blindShare(share) {
		return Buffer.concat([getRandomBytes(32), share]);
	}
};

//#endregion
//#region src/enclave/local.ts
var LocalEnclave = class extends BaseProvider {
	allowedEncryptionStores;
	store;
	storeWithCodec;
	mpcClientInstance;
	storedEncryptionProfile;
	constructor(options) {
		super(options);
		this.allowedEncryptionStores = options.allowedEncryptionStores ?? ["user"];
		this.store = options.store ?? new LocalStorageStore();
		this.storeWithCodec = this.store.pipeCodec(Base64Codec);
		if (options.mpcConfiguration) this.mpcClientInstance = new Client(options.mpcConfiguration.nodeUrl, options.mpcConfiguration.contractAddress);
	}
	/** @override parent method to reset the enclave */
	async reset() {
		await super.reset();
		this.storedEncryptionProfile = void 0;
		this.store.reset();
	}
	/** @see parent method extended with loading the profile from the store */
	async load() {
		await super.load();
		const password = await this.store.get(STORAGE_KEYS.PASSWORD);
		const userId = await this.store.get(STORAGE_KEYS.USER_ID);
		const encryptionSecretKey = await this.storeWithCodec.get(STORAGE_KEYS.ENCRYPTION_SECRET_KEY);
		if (!password || !userId || !encryptionSecretKey) return;
		let encryptionPasswordStore = await this.store.get(STORAGE_KEYS.ENCRYPTION_PASSWORD_STORE);
		if (!encryptionPasswordStore || encryptionPasswordStore === "password") encryptionPasswordStore = "user";
		this.storedEncryptionProfile = {
			userId,
			password,
			keyPair: nacl.box.keyPair.fromSecretKey(encryptionSecretKey),
			encryptionPasswordStore
		};
	}
	/**
	* Encrypts a message to a receiver.
	* This method also checks if the user is authorized to use the keys.
	*
	* @param message - The message to encrypt.
	* @param receiverPublicKey - The public key of the receiver.
	*
	* @returns The encrypted message.
	*/
	async encrypt(message, receiverPublicKey) {
		const { keyPair } = await this.getPrivateEncryptionProfile();
		return encrypt(message, keyPair.publicKey, receiverPublicKey);
	}
	/**
	* Decrypts a message from a sender.
	* This method also checks if the user is authorized to use the keys.
	*
	* @param message - The message to decrypt.
	* @param senderPublicKey - The public key of the sender.
	*
	* @returns The decrypted message.
	*/
	async decrypt(message, senderPublicKey) {
		const { keyPair } = await this.getPrivateEncryptionProfile();
		return decrypt(message, keyPair, senderPublicKey);
	}
	/**
	* @see BaseProvider#getPrivateEncryptionProfile
	*/
	async getPrivateEncryptionProfile(skipGuard = false) {
		if (this.storedEncryptionProfile) {
			let canBeUsed = this.storedEncryptionProfile.userId === this.userId;
			if (canBeUsed && !skipGuard) canBeUsed = await this.guardKeys();
			if (canBeUsed) return this.storedEncryptionProfile;
			await this.reset();
		}
		let password;
		let encryptionPasswordStore;
		const context = await this.getPasswordContext();
		if (context.encryptionPasswordStore === "user") {
			await this.store.setRememberDuration(context.duration);
			password = context.password;
			encryptionPasswordStore = context.encryptionPasswordStore;
		}
		if (context.encryptionPasswordStore === "mpc") {
			await this.store.setRememberDuration(void 0);
			password = await this.ensureMPCPassword();
			encryptionPasswordStore = "mpc";
		}
		if (!password || !encryptionPasswordStore) throw new Error("Password or encryption password store is not found");
		return this.createEncryptionProfileFromPassword(password, this.userId, encryptionPasswordStore);
	}
	/** @see BaseProvider#ensureUserEncryptionProfile */
	async ensureUserEncryptionProfile() {
		const { keyPair, encryptionPasswordStore, userId } = await this.getPrivateEncryptionProfile();
		return {
			userId,
			userEncryptionPublicKey: base64Encode(keyPair.publicKey),
			encryptionPasswordStore
		};
	}
	/**
	* This method needs to check `options` and should derive the password context from it.
	*
	* @returns The password context.
	*/
	async getPasswordContext() {
		throw new Error("Method 'getPasswordContext' has to be implemented in the subclass.");
	}
	/**
	* Creates and store encryption profile from a password.
	*
	* @param password - The password to use.
	* @param userId - The user id to use.
	* @param encryptionPasswordStore - The encryption password store to use.
	*
	* @returns The encryption profile.
	*/
	async createEncryptionProfileFromPassword(password, userId, encryptionPasswordStore) {
		const secretKey = await keyDerivation(password, userId);
		const keyPair = nacl.box.keyPair.fromSecretKey(secretKey);
		await this.store.set(STORAGE_KEYS.USER_ID, userId);
		await this.store.set(STORAGE_KEYS.PASSWORD, password);
		await this.store.set(STORAGE_KEYS.ENCRYPTION_PASSWORD_STORE, encryptionPasswordStore);
		await this.storeWithCodec.set(STORAGE_KEYS.ENCRYPTION_SECRET_KEY, keyPair.secretKey);
		await this.storeWithCodec.set(STORAGE_KEYS.ENCRYPTION_PUBLIC_KEY, keyPair.publicKey);
		this.storedEncryptionProfile = {
			userId,
			password,
			keyPair,
			encryptionPasswordStore
		};
		return this.storedEncryptionProfile;
	}
	async ensureMPCPassword() {
		if (this.options?.mode !== "new") {
			const { status: downloadStatus, secret: downloadedPassword } = await this.downloadSecret();
			if (downloadStatus === "ok" && downloadedPassword) return utf8Decode(downloadedPassword);
		}
		const password = this.generatePassword();
		const { status: uploadStatus } = await this.uploadSecret(password);
		if (uploadStatus !== "success") throw Error(`A secret upload failed with status: ${uploadStatus}`);
		return password;
	}
	get mpcClient() {
		if (!this.mpcClientInstance) throw new Error("MPC client is not initialized");
		return this.mpcClientInstance;
	}
	generatePassword() {
		const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
		const length = 20;
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		let password = "";
		for (let i = 0; i < length; i++) password += alphabet[array[i] % alphabet.length];
		return password;
	}
	async downloadSecret() {
		if (!this.options.walletAddress) throw new Error("walletAddress is not found");
		const ephemeralKeyPair = nacl.box.keyPair();
		const signerAddress = this.options.walletAddress;
		const downloadRequest = this.mpcClient.downloadRequest(signerAddress, ephemeralKeyPair.publicKey);
		const messageToSign = this.mpcClient.downloadMessageToSign(downloadRequest);
		const signedMessage = await this.signTypedData(messageToSign.domain, messageToSign.types, messageToSign.value);
		return this.mpcClient.downloadSecret(this.userId, downloadRequest, signedMessage, ephemeralKeyPair.secretKey);
	}
	async uploadSecret(secret) {
		const signerAddress = this.options.walletAddress;
		if (!signerAddress) {
			console.error("signerAddress is not found");
			return { status: "no-signer-address" };
		}
		const blindedShares = this.mpcClient.getBlindedShares(Buffer.from(secret, "utf8"));
		const uploadRequest = this.mpcClient.uploadRequest(blindedShares, signerAddress);
		const messageToSign = this.mpcClient.uploadMessageToSign(uploadRequest);
		const signedMessage = await this.signTypedData(messageToSign.domain, messageToSign.types, messageToSign.value);
		return this.mpcClient.uploadSecret(this.userId, uploadRequest, signedMessage, blindedShares);
	}
};

//#endregion
export { LocalEnclave };
//# sourceMappingURL=local.js.map