import { base64Encode, utf8Decode } from "../codecs-Ddj-ztlR.js";
import { BaseProvider, STORAGE_KEYS } from "../keys-DRzus7df.js";
import { decrypt, encrypt, keyDerivation } from "../encryption-BHOssWvX.js";
import { ADD_ADDRESS_TYPES, DOWNLOAD_TYPES, REMOVE_ADDRESS_TYPES, UPLOAD_TYPES } from "../types-KQOutY5w.js";
import { LocalStorageStore } from "../store-BMwkXBSJ.js";
import * as HexCodec from "@stablelib/hex";
import * as Utf8Codec from "@stablelib/utf8";
import * as Base64Codec from "@stablelib/base64";
import { syncScrypt } from "scrypt-js";
import nacl from "tweetnacl";
import { ChainControllerApi, Configuration } from "@partisiablockchain/blockchain-api-transaction-client";
import { ethers } from "ethers";
import { AbiByteInput } from "@partisiablockchain/abi-client";
import { randomBytes } from "crypto";

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
		const responseClone = response.clone();
		const responseBody = await responseClone.text();
		console.log({
			responseCode: response.status,
			responseBody
		});
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
	return fetch(url, options).then(async (response) => {
		const responseClone = response.clone();
		const responseBody = await responseClone.text();
		console.log({
			responseCode: response.status,
			responseBody
		});
		return response.status.toString();
	}).catch((error) => {
		console.error(error);
		return error;
	});
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
		const responseClone = response.clone();
		const responseBody = await responseClone.text();
		console.log({
			responseCode: response.status,
			responseBody
		});
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
	walletType;
	constructor(baseUrl, contractAddress, walletType) {
		this.contractAddress = contractAddress;
		this.baseUrl = baseUrl;
		this.walletType = walletType;
	}
	getAuthHeader(signature) {
		let prefix;
		console.log({ walletType: this.walletType });
		switch (this.walletType) {
			case "evm":
				prefix = "eip712";
				break;
			case "near":
				prefix = "NEAR";
				break;
			case "xrpl":
				prefix = "XRPL";
				break;
			default: prefix = "eip712";
		}
		return { Authorization: `${prefix} ${signature}` };
	}
	async sendUpload(id, uploadRequest, signature) {
		const authHeader = this.getAuthHeader(signature);
		const url = `${this.baseUrl}/offchain/${this.contractAddress}/shares/${id}`;
		const status = await putRequest(url, uploadRequest, authHeader);
		if (status !== "201") throw new Error(`Error uploading share to ${this.contractAddress} at ${url}`);
		return status;
	}
	async sendDownload(id, downloadRequest, signature) {
		const authHeader = this.getAuthHeader(signature);
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
		return ok;
	}
	async sendAddAddress(id, addRequest, signature) {
		const authHeader = this.getAuthHeader(signature);
		const url = this.baseUrl + "/offchain/" + this.contractAddress + "/shares/" + id + "/add_address";
		const status = await patchRequest(url, addRequest, authHeader);
		if (status !== "200") throw new Error(`Error adding a wallet to ${id} at ${url}`);
		return status;
	}
	async sendRemoveAddress(id, removeRequest, signature) {
		const authHeader = this.getAuthHeader(signature);
		const url = this.baseUrl + "/offchain/" + this.contractAddress + "/shares/" + id + "/remove_address";
		const status = await patchRequest(url, removeRequest, authHeader);
		if (status !== "200") throw new Error(`Error removing address from ${id} at ${url}`);
		return status;
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
/**

*  Polynomials with coefficients in a finite field.

*

* <p>Copied from <a href="https://gitlab.com/partisiablockchain/language/abi/zk-client"> zk-client</a>.

*/
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
		return new Polynomial(this.filterHighZeroes(coefficients, zero));
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
/** Represents an element in GF(2^8) using the reduction polynomial x^8+x^4+x^3+x+1. */
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
	static alphas(numNodes) {
		return Array.from(Array.from({ length: numNodes }, (_value, key) => F256.createElement(key + 1)));
	}
	/**
	
	* Create a polynomial.
	
	* @param coefficients the coefficients of the polynomial
	
	*/
	static createPoly(coefficients) {
		return Polynomial.create(coefficients, this.ZERO);
	}
	/** @inheritDoc */
	add(other) {
		return Constants.elements[this.value ^ other.value];
	}
	/** @inheritDoc */
	isEqualTo(other) {
		return this.value === other.value;
	}
	/** @inheritDoc */
	isOne() {
		return this.value === 1;
	}
	/** @inheritDoc */
	isZero() {
		return this.value === 0;
	}
	/** @inheritDoc */
	modInverse() {
		return Constants.elements[Constants.multiplicativeInverse[this.value]];
	}
	/** @inheritDoc */
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
	/** @inheritDoc */
	negate() {
		return this;
	}
	/** @inheritDoc */
	squareRoot() {
		throw new Error("Not implemented");
	}
	/** @inheritDoc */
	subtract(other) {
		return this.add(other);
	}
};
const Constants = {
	elements: Array.from({ length: 256 }, (_value, key) => F256.createElement(key)),
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

* Try to interpolate a polynomial that passes through at least <code>2 &sdot; maximalDegree + 1

* </code> of the supplied points.

*

* <p>Element lists ({@code xs} and {@code ys}) must have same size.

*

* @param xs x-coordinates in the points

* @param ys y-coordinates in the points

* @param maximalDegree the expected maximal degree

* @param zero 0 element in the Finite Field.

* @param one 1 element in the Finite Field.

*

* @returns the interpolated polynomial or undefined if unable to interpolate

*/
function interpolateIfPossible(xs, ys, maximalDegree, zero, one) {
	if (xs.length !== ys.length) throw new Error("xs and ys must be of same size");
	return interpolateIfPossibleInner(xs, ys, maximalDegree, zero, one);
}
function interpolateIfPossibleInner(xs, ys, maximalDegree, zero, one) {
	if (xs.length <= 2 * maximalDegree + 1) {
		const interpolated = interpolate(xs, ys, zero, one);
		if (interpolated.degree() > maximalDegree) return void 0;
		else return interpolated;
	} else {
		for (let removeIndex = 0; removeIndex < xs.length; removeIndex++) {
			const interpolated = interpolateIfPossibleInner(withoutIndex(xs, removeIndex), withoutIndex(ys, removeIndex), maximalDegree, zero, one);
			if (interpolated !== void 0) return interpolated;
		}
		return void 0;
	}
}
function withoutIndex(values, removeIndex) {
	return values.filter((_value, index, _array) => index != removeIndex);
}
/**

* Utility for lagrange interpolation.

*/
const Lagrange = {
	interpolate,
	interpolateCheckDegree,
	interpolateIfPossible
};

//#endregion
//#region src/mpc/secretsharing/shamir-secret-shares.ts
/** Factory for creating elements of {@link ShamirSecretShares}. */
var ShamirFactory = class {
	shamirConfig;
	/**
	
	* Create the {@link ShamirFactory}.
	
	*
	
	* @param shamirConfig configuration for creating and reconstructing shamir secret shares.
	
	*/
	constructor(shamirConfig) {
		this.shamirConfig = shamirConfig;
	}
	fromPlainText(numNodes, plainText) {
		if (numNodes != this.shamirConfig.numNodes) throw new Error(`This shamir factory expects there to be ${this.shamirConfig.numNodes} nodes, but there was ${numNodes}.`);
		const randomElements = randomBytes(plainText.length * this.shamirConfig.numMalicious);
		const alphas = F256.alphas(this.shamirConfig.numNodes);
		const shares = Array.from({ length: this.shamirConfig.numNodes }, () => []);
		for (let i = 0; i < plainText.length; i++) {
			const coefficients = [F256.createElement(plainText[i])];
			for (let j = 0; j < this.shamirConfig.numMalicious; j++) coefficients.push(F256.createElement(randomElements[this.shamirConfig.numMalicious * i + j]));
			const poly = F256.createPoly(coefficients);
			for (let j = 0; j < this.shamirConfig.numNodes; j++) shares[j].push(poly.evaluate(alphas[j]));
		}
		return new ShamirSecretShares(this.shamirConfig, shares);
	}
	fromSharesBytes(shares) {
		const elementShares = shares.map((bytes) => {
			if (bytes == void 0) return void 0;
			const elements = [];
			for (let i = 0; i < bytes.length; i++) elements.push(F256.createElement(bytes[i]));
			return elements;
		});
		return new ShamirSecretShares(this.shamirConfig, elementShares);
	}
};
/**

* Secure secret-sharing scheme based on shamir-secret sharing.

*

* <p>Supported number of shares ({@code N}): {@code 4}

*

* <p>Based on the java implementation of the secret-sharing client.

*

* @see <a href="https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing">Shamir's secret sharing,

*     Wikipedia</a>

*/
var ShamirSecretShares = class {
	shares;
	shamirConfig;
	constructor(shamirConfig, shares) {
		if (shares.length != shamirConfig.numNodes) throw new Error(`There must be ${shamirConfig.numNodes} nodes`);
		const numReceivedShares = shares.filter((s) => s != void 0).length;
		if (numReceivedShares < shamirConfig.numToReconstruct) throw new Error(`Must have received at least ${shamirConfig.numToReconstruct} shares to reconstruct. Received ${numReceivedShares}.`);
		this.shamirConfig = shamirConfig;
		this.shares = shares;
	}
	getShareBytes(nodeIndex) {
		const share = this.shares[nodeIndex];
		if (share == void 0) throw new Error("Expected share to be defined");
		return Buffer.from(share.map((field) => field.value));
	}
	numShares() {
		return this.shamirConfig.numNodes;
	}
	reconstructPlainText() {
		const alphas = F256.alphas(this.shamirConfig.numNodes);
		const definedAlphas = [];
		const definedShares = [];
		for (let i = 0; i < this.shares.length; i++) {
			const share = this.shares[i];
			if (share != void 0) {
				definedAlphas.push(alphas[i]);
				definedShares.push(share);
			}
		}
		const reconstructedElements = [];
		const numElements = definedShares[0].length;
		for (let i = 0; i < numElements; i++) {
			const sharesOfIthElement = [];
			for (let j = 0; j < definedShares.length; j++) sharesOfIthElement.push(definedShares[j][i]);
			const interpolated = Lagrange.interpolateIfPossible(definedAlphas, sharesOfIthElement, this.shamirConfig.numMalicious, F256.ZERO, F256.ONE);
			if (interpolated === void 0) throw new Error("Unable to reconstruct secret");
			reconstructedElements.push(interpolated.getConstantTerm().value);
		}
		return Buffer.from(reconstructedElements);
	}
	static FACTORY = new ShamirFactory({
		numMalicious: 1,
		numNodes: 4,
		numToReconstruct: 2
	});
};
function getRandomBytes(length) {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Buffer.from(array);
}

//#endregion
//#region src/mpc/client.ts
var Client = class Client {
	baseUrl;
	contractAddress;
	engines;
	signerType;
	signerAddress;
	signerPublicKey;
	factory;
	numNodes;
	constructor(baseUrl, contractAddress, numMalicious, numNodes, numToReconstruct, signerType, signerAddress, signerPublicKey) {
		this.baseUrl = baseUrl;
		this.contractAddress = contractAddress;
		this.signerType = signerType;
		this.signerAddress = signerAddress;
		this.signerPublicKey = signerPublicKey;
		this.numNodes = numNodes;
		this.factory = new ShamirFactory({
			numMalicious,
			numNodes,
			numToReconstruct
		});
	}
	reconfigure(signerType, signerAddress, signerPublicKey) {
		if (![
			"evm",
			"xrpl",
			"near",
			"stellar"
		].includes(signerType)) throw new Error("Invalid signer type");
		this.signerType = signerType;
		this.signerAddress = signerAddress;
		if (signerPublicKey) this.signerPublicKey = signerPublicKey;
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
		const secretShares = this.factory.fromPlainText(this.numNodes, secret);
		var blindedShares = [];
		for (let i = 0; i < secretShares.numShares(); i++) blindedShares.push(Client.blindShare(secretShares.getShareBytes(i)));
		return blindedShares;
	}
	uploadMessageToSign(uploadRequest) {
		return {
			domain: this.getTypedDomain(),
			types: UPLOAD_TYPES,
			value: uploadRequest
		};
	}
	uploadRequest(blindedShares) {
		console.log("UPLOADING TO MPC");
		var address = "";
		switch (this.signerType) {
			case "evm":
				address = `eip712:${this.signerAddress}`;
				break;
			case "xrpl":
				address = `XRPL:${this.signerPublicKey}`;
				break;
			case "near":
				address = `NEAR:${this.signerPublicKey?.replace("ed25519:", "")}`;
				break;
			default: throw new Error("Invalid signer type");
		}
		return {
			share_commitments: blindedShares.map((b) => ethers.keccak256(b)),
			recovering_addresses: [address]
		};
	}
	downloadMessageToSign(downloadRequest) {
		return {
			domain: this.getTypedDomain(),
			types: DOWNLOAD_TYPES,
			value: downloadRequest
		};
	}
	downloadRequest(publicKey) {
		var address = "";
		switch (this.signerType) {
			case "evm":
				address = `eip712:${this.signerAddress}`;
				break;
			case "xrpl":
				address = `XRPL:${this.signerPublicKey}`;
				break;
			case "near":
				address = `NEAR:${this.signerPublicKey?.replace("ed25519:", "")}`;
				break;
			default: throw new Error("Invalid signer type");
		}
		return {
			recovering_address: address,
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
			secret = this.factory.fromSharesBytes(secretShares.map((item) => item.share)).reconstructPlainText();
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
	addAddressMessageToSign(addressToAdd, publicKey, addressToAddType) {
		var address = "";
		switch (this.signerType) {
			case "evm":
				address = `eip712:${this.signerAddress}`;
				break;
			case "xrpl":
				address = `XRPL:${this.signerPublicKey}`;
				break;
			case "near":
				address = `NEAR:${this.signerPublicKey?.replace("ed25519:", "")}`;
				break;
			default: throw new Error("Invalid signer type");
		}
		var addressToAddFormatted = "";
		switch (addressToAddType.toLowerCase()) {
			case "evm":
				addressToAddFormatted = `eip712:${addressToAdd}`;
				break;
			case "xrpl":
				addressToAddFormatted = `XRPL:${publicKey}`;
				break;
			case "near":
				addressToAddFormatted = `NEAR:${publicKey?.replace("ed25519:", "")}`;
				break;
			default: throw new Error("Invalid address to add type");
		}
		const value = {
			recovering_address: address,
			address_to_add: addressToAddFormatted,
			timestamp: (/* @__PURE__ */ new Date()).getTime()
		};
		return {
			domain: this.getTypedDomain(),
			types: ADD_ADDRESS_TYPES,
			value
		};
	}
	removeAddressMessageToSign(addressToRemove, publicKey, addressToRemoveType) {
		var address = "";
		switch (this.signerType) {
			case "evm":
				address = `eip712:${this.signerAddress}`;
				break;
			case "xrpl":
				address = `XRPL:${this.signerPublicKey}`;
				break;
			case "near":
				address = `NEAR:${this.signerPublicKey?.replace("ed25519:", "")}`;
				break;
			default: throw new Error("Invalid signer type");
		}
		var addressToRemoveFormatted = "";
		switch (addressToRemoveType.toLowerCase()) {
			case "evm":
				addressToRemoveFormatted = `eip712:${addressToRemove}`;
				break;
			case "xrpl":
				addressToRemoveFormatted = `XRPL:${publicKey}`;
				break;
			case "near":
				addressToRemoveFormatted = `NEAR:${publicKey?.replace("ed25519:", "")}`;
				break;
			default: throw new Error("Invalid address to remove type");
		}
		const value = {
			recovering_address: address,
			address_to_remove: addressToRemoveFormatted,
			timestamp: (/* @__PURE__ */ new Date()).getTime()
		};
		return {
			domain: this.getTypedDomain(),
			types: REMOVE_ADDRESS_TYPES,
			value
		};
	}
	async addAddress(userId, message, signature) {
		const engineClients = await this.getEngines();
		const promises = [];
		for (let i = 0; i < engineClients.length; i++) {
			const engineClient = engineClients[i];
			promises.push(engineClient.sendAddAddress(userId, message, signature));
		}
		const statuses = await Promise.all(promises);
		if (statuses.every((item) => item === "200")) return "success";
		return "failure";
	}
	async removeAddress(userId, message, signature) {
		const engineClients = await this.getEngines();
		const promises = [];
		for (let i = 0; i < engineClients.length; i++) {
			const engineClient = engineClients[i];
			promises.push(engineClient.sendRemoveAddress(userId, message, signature));
		}
		const statuses = await Promise.all(promises);
		if (statuses.every((item) => item === "200")) return "success";
		return "failure";
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
			this.engines = state.nodes.map((value) => new EngineClient(value.endpoint, this.contractAddress, this.signerType));
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
	storeBase64;
	storeObfuscated;
	storeObfuscatedBase64;
	mpcClientInstance;
	storedEncryptionProfile;
	constructor(options) {
		super(options);
		this.allowedEncryptionStores = options.allowedEncryptionStores ?? ["user"];
		this.store = options.store ?? new LocalStorageStore();
		this.storeObfuscated = this.store.pipeCodec(this.userIdObfuscationCodec());
		this.storeBase64 = this.store.pipeCodec(Base64Codec);
		this.storeObfuscatedBase64 = this.store.pipeCodec(this.userIdObfuscationCodec()).pipeCodec(Base64Codec);
		if (options.mpcConfiguration) this.mpcClientInstance = new Client(options.mpcConfiguration.nodeUrl, options.mpcConfiguration.contractAddress, options.mpcConfiguration.numMalicious, options.mpcConfiguration.numNodes, options.mpcConfiguration.numToReconstruct, options.walletType ?? "", options.walletAddress ?? "", options.walletPublicKey);
	}
	/** @override parent method to reset the enclave */
	async reset() {
		await super.reset();
		this.storedEncryptionProfile = void 0;
		this.store.reset();
	}
	/** @override parent method to reconfigure the enclave */
	async reconfigure(options = {}) {
		await super.reconfigure(options);
		if (this.mpcClientInstance && options.walletType && options.walletAddress) this.mpcClientInstance.reconfigure(options.walletType ?? "", options.walletAddress ?? "", options.walletPublicKey);
	}
	/**
	
	* Return a codec that encrypts/decrypts data using a key derived from the provider's user ID.
	
	*
	
	* This ensures that data is minimally obfuscated to avoid low-sophistication attacks.
	
	*/
	userIdObfuscationCodec() {
		const self = this;
		const toKey = (userId, salt) => syncScrypt(Utf8Codec.encode(userId), salt, 16384, 8, 1, nacl.secretbox.keyLength);
		return {
			encode(data) {
				if (!self.options.userId) throw new Error("User ID required for encryption");
				const dataBytes = Utf8Codec.encode(data);
				const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
				const salt = nacl.randomBytes(16);
				const key = toKey(self.options.userId, salt);
				const payload = nacl.secretbox(dataBytes, nonce, key);
				const combined = new Uint8Array(salt.length + nonce.length + payload.length);
				combined.set(salt, 0);
				combined.set(nonce, salt.length);
				combined.set(payload, salt.length + nonce.length);
				return `0x${HexCodec.encode(combined)}`;
			},
			decode(payload) {
				if (!self.options.userId) throw new Error("User ID required for decryption");
				if (payload.slice(0, 2) !== "0x") throw new Error(`missing 0x prefix: ${payload}`);
				const combined = HexCodec.decode(payload.slice(2));
				const salt = combined.slice(0, 16);
				const nonce = combined.slice(16, 16 + nacl.secretbox.nonceLength);
				const ciphertext = combined.slice(16 + nacl.secretbox.nonceLength);
				const key = toKey(self.options.userId, salt);
				const result = nacl.secretbox.open(ciphertext, nonce, key);
				if (!result) throw new Error("Failed to decrypt data");
				return Utf8Codec.decode(result);
			}
		};
	}
	/** @see parent method extended with loading the profile from the store */
	async load() {
		await super.load();
		const userId = await this.store.get(STORAGE_KEYS.USER_ID);
		if (userId) this.options.userId = userId;
		let password = await this.storeObfuscated.get(STORAGE_KEYS.OBFUSCATED_PASSWORD);
		if (!password) {
			password = await this.store.get(STORAGE_KEYS.DEPRECATED___PASSWORD);
			if (!password) return;
			await this.storeObfuscated.set(STORAGE_KEYS.OBFUSCATED_PASSWORD, password);
		}
		await this.store.delete(STORAGE_KEYS.DEPRECATED___PASSWORD);
		let encryptionSecretKey = await this.storeObfuscatedBase64.get(STORAGE_KEYS.OBFUSCATED_BASE64_ENCRYPTION_SECRET_KEY);
		if (!encryptionSecretKey) {
			encryptionSecretKey = await this.storeBase64.get(STORAGE_KEYS.DEPRECATED___ENCRYPTION_SECRET_KEY);
			if (!encryptionSecretKey) return;
			await this.storeObfuscatedBase64.set(STORAGE_KEYS.OBFUSCATED_BASE64_ENCRYPTION_SECRET_KEY, encryptionSecretKey);
		}
		await this.store.delete(STORAGE_KEYS.DEPRECATED___ENCRYPTION_SECRET_KEY);
		await this.store.delete(STORAGE_KEYS.DEPRECATED___ENCRYPTION_PRIVATE_KEY);
		if (!password || !userId || !encryptionSecretKey) return;
		let encryptionPasswordStore = await this.store.get(STORAGE_KEYS.ENCRYPTION_PASSWORD_STORE);
		if (!encryptionPasswordStore || encryptionPasswordStore === "password") {
			encryptionPasswordStore = "user";
			await this.store.set(STORAGE_KEYS.ENCRYPTION_PASSWORD_STORE, encryptionPasswordStore);
		}
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
		await this.storeObfuscated.set(STORAGE_KEYS.OBFUSCATED_PASSWORD, password);
		await this.store.delete(STORAGE_KEYS.DEPRECATED___PASSWORD);
		await this.store.set(STORAGE_KEYS.ENCRYPTION_PASSWORD_STORE, encryptionPasswordStore);
		await this.storeObfuscatedBase64.set(STORAGE_KEYS.OBFUSCATED_BASE64_ENCRYPTION_SECRET_KEY, keyPair.secretKey);
		await this.store.delete(STORAGE_KEYS.DEPRECATED___ENCRYPTION_SECRET_KEY);
		await this.storeBase64.set(STORAGE_KEYS.ENCRYPTION_PUBLIC_KEY, keyPair.publicKey);
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
			throw Error("A secret might be stored at MPC ZK nodes, but can't be obtained");
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
		const downloadRequest = this.mpcClient.downloadRequest(ephemeralKeyPair.publicKey);
		const messageToSign = this.mpcClient.downloadMessageToSign(downloadRequest);
		const signedMessage = await this.signTypedData(messageToSign.domain, messageToSign.types, messageToSign.value);
		return this.mpcClient.downloadSecret(this.userId, downloadRequest, signedMessage, ephemeralKeyPair.secretKey);
	}
	async uploadSecret(secret) {
		if (!this.options.walletAddress) {
			console.error("signerAddress is not found");
			return { status: "no-signer-address" };
		}
		const blindedShares = this.mpcClient.getBlindedShares(Buffer.from(secret, "utf8"));
		const uploadRequest = this.mpcClient.uploadRequest(blindedShares);
		const messageToSign = this.mpcClient.uploadMessageToSign(uploadRequest);
		const signedMessage = await this.signTypedData(messageToSign.domain, messageToSign.types, messageToSign.value);
		return this.mpcClient.uploadSecret(this.userId, uploadRequest, signedMessage, blindedShares);
	}
	async addAddressMessageToSign(address, publicKey, addressToAddType) {
		return this.mpcClient.addAddressMessageToSign(address, publicKey, addressToAddType);
	}
	async removeAddressMessageToSign(address, publicKey, addressToRemoveType) {
		return this.mpcClient.removeAddressMessageToSign(address, publicKey, addressToRemoveType);
	}
	async addAddressToMpcSecret(userId, message, signature) {
		return this.mpcClient.addAddress(userId, message, signature);
	}
	async removeAddressFromMpcSecret(userId, message, signature) {
		return this.mpcClient.removeAddress(userId, message, signature);
	}
};

//#endregion
export { LocalEnclave };
//# sourceMappingURL=local.js.map