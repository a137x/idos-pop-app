import { base64Decode, base64Encode, binaryWriteUint16BE, borshSerialize, bs58Decode, bs58Encode, bytesConcat, hexDecode, hexEncode, hexEncodeSha256Hash, sha256Hash, utf8Decode, utf8Encode } from "@idos-network/utils/codecs";
import nacl from "tweetnacl";
import { KwilSigner, NodeKwil, Utils, WebKwil } from "@idos-network/kwil-js";
import * as xrpKeypair from "ripple-keypairs";
import { Ed25519Signature2020 } from "@digitalbazaar/ed25519-signature-2020";
import * as vc from "@digitalbazaar/vc";
import { Ed25519VerificationKey2020 } from "@digitalbazaar/ed25519-verification-key-2020";
import "base85";
import { JsonLdDocumentLoader } from "jsonld-document-loader";

//#region ../@core/src/cryptography/index.ts
/**

* Decrypts a message using the sender's public key and the recipient's secret key.

*/
function decryptContent(message, nonce, senderEncryptionPublicKey, recipientEncryptionSecretKey) {
	const decrypted = nacl.box.open(message, nonce, senderEncryptionPublicKey, recipientEncryptionSecretKey);
	if (decrypted === null) throw Error(`Couldn't decrypt the provided message. ${JSON.stringify({
		message: base64Encode(message),
		nonce: base64Encode(nonce),
		senderEncryptionPublicKey: base64Encode(senderEncryptionPublicKey),
		recipientEncryptionSecretKey: base64Encode(recipientEncryptionSecretKey)
	}, null, 2)}`);
	return decrypted;
}
var NoncedBox = class NoncedBox {
	keyPair;
	constructor(keyPair) {
		this.keyPair = keyPair;
	}
	static nonceFromBase64SecretKey(secret) {
		return new NoncedBox(nacl.box.keyPair.fromSecretKey(base64Decode(secret)));
	}
	async decrypt(b64FullMessage, b64SenderPublicKey) {
		const decodedMessage = base64Decode(b64FullMessage);
		const senderEncryptionPublicKey = base64Decode(b64SenderPublicKey);
		const message = decodedMessage.slice(nacl.box.nonceLength, decodedMessage.length);
		const nonce = decodedMessage.slice(0, nacl.box.nonceLength);
		const content = decryptContent(message, nonce, senderEncryptionPublicKey, this.keyPair.secretKey);
		return utf8Decode(content);
	}
};

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/core.js
/** A special constant with type `never` */
const NEVER = Object.freeze({ status: "aborted" });
function $constructor(name, initializer$2, params) {
	function init(inst, def) {
		var _a;
		Object.defineProperty(inst, "_zod", {
			value: inst._zod ?? {},
			enumerable: false
		});
		(_a = inst._zod).traits ?? (_a.traits = /* @__PURE__ */ new Set());
		inst._zod.traits.add(name);
		initializer$2(inst, def);
		for (const k in _.prototype) if (!(k in inst)) Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
		inst._zod.constr = _;
		inst._zod.def = def;
	}
	const Parent = params?.Parent ?? Object;
	class Definition extends Parent {}
	Object.defineProperty(Definition, "name", { value: name });
	function _(def) {
		var _a;
		const inst = params?.Parent ? new Definition() : this;
		init(inst, def);
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		for (const fn of inst._zod.deferred) fn();
		return inst;
	}
	Object.defineProperty(_, "init", { value: init });
	Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
		if (params?.Parent && inst instanceof params.Parent) return true;
		return inst?._zod?.traits?.has(name);
	} });
	Object.defineProperty(_, "name", { value: name });
	return _;
}
const $brand = Symbol("zod_brand");
var $ZodAsyncError = class extends Error {
	constructor() {
		super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
	}
};
const globalConfig = {};
function config(newConfig) {
	if (newConfig) Object.assign(globalConfig, newConfig);
	return globalConfig;
}

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
	const numericValues = Object.values(entries).filter((v) => typeof v === "number");
	const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
	return values;
}
function jsonStringifyReplacer(_, value) {
	if (typeof value === "bigint") return value.toString();
	return value;
}
function cached(getter) {
	const set = false;
	return { get value() {
		if (!set) {
			const value = getter();
			Object.defineProperty(this, "value", { value });
			return value;
		}
		throw new Error("cached value already set");
	} };
}
function nullish(input) {
	return input === null || input === void 0;
}
function cleanRegex(source) {
	const start = source.startsWith("^") ? 1 : 0;
	const end = source.endsWith("$") ? source.length - 1 : source.length;
	return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
	const valDecCount = (val.toString().split(".")[1] || "").length;
	const stepString = step.toString();
	let stepDecCount = (stepString.split(".")[1] || "").length;
	if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
		const match = stepString.match(/\d?e-(\d?)/);
		if (match?.[1]) stepDecCount = Number.parseInt(match[1]);
	}
	const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
	const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
	const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
	return valInt % stepInt / 10 ** decCount;
}
const EVALUATING = Symbol("evaluating");
function defineLazy(object$1, key, getter) {
	let value = void 0;
	Object.defineProperty(object$1, key, {
		get() {
			if (value === EVALUATING) return void 0;
			if (value === void 0) {
				value = EVALUATING;
				value = getter();
			}
			return value;
		},
		set(v) {
			Object.defineProperty(object$1, key, { value: v });
		},
		configurable: true
	});
}
function assignProp(target, prop, value) {
	Object.defineProperty(target, prop, {
		value,
		writable: true,
		enumerable: true,
		configurable: true
	});
}
function mergeDefs(...defs) {
	const mergedDescriptors = {};
	for (const def of defs) {
		const descriptors = Object.getOwnPropertyDescriptors(def);
		Object.assign(mergedDescriptors, descriptors);
	}
	return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
	return JSON.stringify(str);
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
	return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = cached(() => {
	if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
	try {
		const F = Function;
		new F("");
		return true;
	} catch (_) {
		return false;
	}
});
function isPlainObject(o) {
	if (isObject(o) === false) return false;
	const ctor = o.constructor;
	if (ctor === void 0) return true;
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;
	if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
	return true;
}
const propertyKeyTypes = new Set([
	"string",
	"number",
	"symbol"
]);
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
	const cl = new inst._zod.constr(def ?? inst._zod.def);
	if (!def || params?.parent) cl._zod.parent = inst;
	return cl;
}
function normalizeParams(_params) {
	const params = _params;
	if (!params) return {};
	if (typeof params === "string") return { error: () => params };
	if (params?.message !== void 0) {
		if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
		params.error = params.message;
	}
	delete params.message;
	if (typeof params.error === "string") return {
		...params,
		error: () => params.error
	};
	return params;
}
function optionalKeys(shape) {
	return Object.keys(shape).filter((k) => {
		return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
	});
}
const NUMBER_FORMAT_RANGES = {
	safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
	const currDef = schema._zod.def;
	const def = mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = {};
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				newShape[key] = currDef.shape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	});
	return clone(schema, def);
}
function omit(schema, mask) {
	const currDef = schema._zod.def;
	const def = mergeDefs(schema._zod.def, {
		get shape() {
			const newShape = { ...schema._zod.def.shape };
			for (const key in mask) {
				if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				delete newShape[key];
			}
			assignProp(this, "shape", newShape);
			return newShape;
		},
		checks: []
	});
	return clone(schema, def);
}
function extend(schema, shape) {
	if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
	const def = mergeDefs(schema._zod.def, {
		get shape() {
			const _shape = {
				...schema._zod.def.shape,
				...shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		checks: []
	});
	return clone(schema, def);
}
function merge(a, b) {
	const def = mergeDefs(a._zod.def, {
		get shape() {
			const _shape = {
				...a._zod.def.shape,
				...b._zod.def.shape
			};
			assignProp(this, "shape", _shape);
			return _shape;
		},
		get catchall() {
			return b._zod.def.catchall;
		},
		checks: []
	});
	return clone(a, def);
}
function partial(Class, schema, mask) {
	const def = mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = Class ? new Class({
					type: "optional",
					innerType: oldShape[key]
				}) : oldShape[key];
			}
			else for (const key in oldShape) shape[key] = Class ? new Class({
				type: "optional",
				innerType: oldShape[key]
			}) : oldShape[key];
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	});
	return clone(schema, def);
}
function required(Class, schema, mask) {
	const def = mergeDefs(schema._zod.def, {
		get shape() {
			const oldShape = schema._zod.def.shape;
			const shape = { ...oldShape };
			if (mask) for (const key in mask) {
				if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
				if (!mask[key]) continue;
				shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
			}
			else for (const key in oldShape) shape[key] = new Class({
				type: "nonoptional",
				innerType: oldShape[key]
			});
			assignProp(this, "shape", shape);
			return shape;
		},
		checks: []
	});
	return clone(schema, def);
}
function aborted(x, startIndex = 0) {
	for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
	return false;
}
function prefixIssues(path, issues) {
	return issues.map((iss) => {
		var _a;
		(_a = iss).path ?? (_a.path = []);
		iss.path.unshift(path);
		return iss;
	});
}
function unwrapMessage(message) {
	return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config$1) {
	const full = {
		...iss,
		path: iss.path ?? []
	};
	if (!iss.message) {
		const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config$1.customError?.(iss)) ?? unwrapMessage(config$1.localeError?.(iss)) ?? "Invalid input";
		full.message = message;
	}
	delete full.inst;
	delete full.continue;
	if (!ctx?.reportInput) delete full.input;
	return full;
}
function getLengthableOrigin(input) {
	if (Array.isArray(input)) return "array";
	if (typeof input === "string") return "string";
	return "unknown";
}
function issue(...args) {
	const [iss, input, inst] = args;
	if (typeof iss === "string") return {
		message: iss,
		code: "custom",
		input,
		inst
	};
	return { ...iss };
}

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/errors.js
const initializer$1 = (inst, def) => {
	inst.name = "$ZodError";
	Object.defineProperty(inst, "_zod", {
		value: inst._zod,
		enumerable: false
	});
	Object.defineProperty(inst, "issues", {
		value: def,
		enumerable: false
	});
	inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
	Object.defineProperty(inst, "toString", {
		value: () => inst.message,
		enumerable: false
	});
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error, mapper = (issue$1) => issue$1.message) {
	const fieldErrors = {};
	const formErrors = [];
	for (const sub of error.issues) if (sub.path.length > 0) {
		fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
		fieldErrors[sub.path[0]].push(mapper(sub));
	} else formErrors.push(mapper(sub));
	return {
		formErrors,
		fieldErrors
	};
}
function formatError(error, _mapper) {
	const mapper = _mapper || function(issue$1) {
		return issue$1.message;
	};
	const fieldErrors = { _errors: [] };
	const processError = (error$1) => {
		for (const issue$1 of error$1.issues) if (issue$1.code === "invalid_union" && issue$1.errors.length) issue$1.errors.map((issues) => processError({ issues }));
		else if (issue$1.code === "invalid_key") processError({ issues: issue$1.issues });
		else if (issue$1.code === "invalid_element") processError({ issues: issue$1.issues });
		else if (issue$1.path.length === 0) fieldErrors._errors.push(mapper(issue$1));
		else {
			let curr = fieldErrors;
			let i = 0;
			while (i < issue$1.path.length) {
				const el = issue$1.path[i];
				const terminal = i === issue$1.path.length - 1;
				if (!terminal) curr[el] = curr[el] || { _errors: [] };
				else {
					curr[el] = curr[el] || { _errors: [] };
					curr[el]._errors.push(mapper(issue$1));
				}
				curr = curr[el];
				i++;
			}
		}
	};
	processError(error);
	return fieldErrors;
}

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/parse.js
const _parse = (_Err) => (schema, value, _ctx, _params) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	if (result.issues.length) {
		const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, _params?.callee);
		throw e;
	}
	return result.value;
};
const parse$1 = /* @__PURE__ */ _parse($ZodRealError);
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	if (result.issues.length) {
		const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
		captureStackTrace(e, params?.callee);
		throw e;
	}
	return result.value;
};
const parseAsync$1 = /* @__PURE__ */ _parseAsync($ZodRealError);
const _safeParse = (_Err) => (schema, value, _ctx) => {
	const ctx = _ctx ? {
		..._ctx,
		async: false
	} : { async: false };
	const result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) throw new $ZodAsyncError();
	return result.issues.length ? {
		success: false,
		error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
	const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
	let result = schema._zod.run({
		value,
		issues: []
	}, ctx);
	if (result instanceof Promise) result = await result;
	return result.issues.length ? {
		success: false,
		error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	} : {
		success: true,
		data: result.value
	};
};
const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/regexes.js
const cuid = /^[cC][^\s-]{8,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
*
* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid$1 = (version$1) => {
	if (!version$1) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;
	return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version$1}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
/** Practical email validation */
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
	return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
const e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
	const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
	const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
	return regex;
}
function time$1(args) {
	return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
	const time$2 = timeSource({ precision: args.precision });
	const opts = ["Z"];
	if (args.local) opts.push("");
	if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
	const timeRegex = `${time$2}(?:${opts.join("|")})`;
	return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
	const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
	return new RegExp(`^${regex}$`);
};
const integer = /^\d+$/;
const number$1 = /^-?\d+(?:\.\d+)?/i;
const boolean$1 = /true|false/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/checks.js
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
	var _a;
	inst._zod ?? (inst._zod = {});
	inst._zod.def = def;
	(_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
	number: "number",
	bigint: "bigint",
	object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
		if (def.value < curr) if (def.inclusive) bag.maximum = def.value;
		else bag.exclusiveMaximum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
	$ZodCheck.init(inst, def);
	const origin = numericOriginMap[typeof def.value];
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
		if (def.value > curr) if (def.inclusive) bag.minimum = def.value;
		else bag.exclusiveMinimum = def.value;
	});
	inst._zod.check = (payload) => {
		if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.value,
			input: payload.value,
			inclusive: def.inclusive,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		var _a;
		(_a = inst$1._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
	});
	inst._zod.check = (payload) => {
		if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
		const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
		if (isMultiple) return;
		payload.issues.push({
			origin: typeof payload.value,
			code: "not_multiple_of",
			divisor: def.value,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
	$ZodCheck.init(inst, def);
	def.format = def.format || "float64";
	const isInt = def.format?.includes("int");
	const origin = isInt ? "int" : "number";
	const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = def.format;
		bag.minimum = minimum;
		bag.maximum = maximum;
		if (isInt) bag.pattern = integer;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		if (isInt) {
			if (!Number.isInteger(input)) {
				payload.issues.push({
					expected: origin,
					format: def.format,
					code: "invalid_type",
					continue: false,
					input,
					inst
				});
				return;
			}
			if (!Number.isSafeInteger(input)) {
				if (input > 0) payload.issues.push({
					input,
					code: "too_big",
					maximum: Number.MAX_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					continue: !def.abort
				});
				else payload.issues.push({
					input,
					code: "too_small",
					minimum: Number.MIN_SAFE_INTEGER,
					note: "Integers must be within the safe integer range.",
					inst,
					origin,
					continue: !def.abort
				});
				return;
			}
		}
		if (input < minimum) payload.issues.push({
			origin: "number",
			input,
			code: "too_small",
			minimum,
			inclusive: true,
			inst,
			continue: !def.abort
		});
		if (input > maximum) payload.issues.push({
			origin: "number",
			input,
			code: "too_big",
			maximum,
			inst
		});
	};
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const curr = inst$1._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
		if (def.maximum < curr) inst$1._zod.bag.maximum = def.maximum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length <= def.maximum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_big",
			maximum: def.maximum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const curr = inst$1._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
		if (def.minimum > curr) inst$1._zod.bag.minimum = def.minimum;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length >= def.minimum) return;
		const origin = getLengthableOrigin(input);
		payload.issues.push({
			origin,
			code: "too_small",
			minimum: def.minimum,
			inclusive: true,
			input,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
	var _a;
	$ZodCheck.init(inst, def);
	(_a = inst._zod.def).when ?? (_a.when = (payload) => {
		const val = payload.value;
		return !nullish(val) && val.length !== void 0;
	});
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.minimum = def.length;
		bag.maximum = def.length;
		bag.length = def.length;
	});
	inst._zod.check = (payload) => {
		const input = payload.value;
		const length = input.length;
		if (length === def.length) return;
		const origin = getLengthableOrigin(input);
		const tooBig = length > def.length;
		payload.issues.push({
			origin,
			...tooBig ? {
				code: "too_big",
				maximum: def.length
			} : {
				code: "too_small",
				minimum: def.length
			},
			inclusive: true,
			exact: true,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
	var _a, _b;
	$ZodCheck.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = def.format;
		if (def.pattern) {
			bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
			bag.patterns.add(def.pattern);
		}
	});
	if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: def.format,
			input: payload.value,
			...def.pattern ? { pattern: def.pattern.toString() } : {},
			inst,
			continue: !def.abort
		});
	});
	else (_b = inst._zod).check ?? (_b.check = () => {});
});
const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		def.pattern.lastIndex = 0;
		if (def.pattern.test(payload.value)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: payload.value,
			pattern: def.pattern.toString(),
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
	def.pattern ?? (def.pattern = lowercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
	def.pattern ?? (def.pattern = uppercase);
	$ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
	$ZodCheck.init(inst, def);
	const escapedRegex = escapeRegex(def.includes);
	const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
	def.pattern = pattern;
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.includes(def.includes, def.position)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: def.includes,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.startsWith(def.prefix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: def.prefix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
	$ZodCheck.init(inst, def);
	const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
	def.pattern ?? (def.pattern = pattern);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
		bag.patterns.add(pattern);
	});
	inst._zod.check = (payload) => {
		if (payload.value.endsWith(def.suffix)) return;
		payload.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: def.suffix,
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
	$ZodCheck.init(inst, def);
	inst._zod.check = (payload) => {
		payload.value = def.tx(payload.value);
	};
});

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/doc.js
var Doc = class {
	constructor(args = []) {
		this.content = [];
		this.indent = 0;
		if (this) this.args = args;
	}
	indented(fn) {
		this.indent += 1;
		fn(this);
		this.indent -= 1;
	}
	write(arg) {
		if (typeof arg === "function") {
			arg(this, { execution: "sync" });
			arg(this, { execution: "async" });
			return;
		}
		const content = arg;
		const lines = content.split("\n").filter((x) => x);
		const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
		const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
		for (const line of dedented) this.content.push(line);
	}
	compile() {
		const F = Function;
		const args = this?.args;
		const content = this?.content ?? [``];
		const lines = [...content.map((x) => `  ${x}`)];
		return new F(...args, lines.join("\n"));
	}
};

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/versions.js
const version = {
	major: 4,
	minor: 0,
	patch: 14
};

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/schemas.js
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
	var _a;
	inst ?? (inst = {});
	inst._zod.def = def;
	inst._zod.bag = inst._zod.bag || {};
	inst._zod.version = version;
	const checks = [...inst._zod.def.checks ?? []];
	if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
	for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
	if (checks.length === 0) {
		(_a = inst._zod).deferred ?? (_a.deferred = []);
		inst._zod.deferred?.push(() => {
			inst._zod.run = inst._zod.parse;
		});
	} else {
		const runChecks = (payload, checks$1, ctx) => {
			let isAborted = aborted(payload);
			let asyncResult;
			for (const ch of checks$1) {
				if (ch._zod.def.when) {
					const shouldRun = ch._zod.def.when(payload);
					if (!shouldRun) continue;
				} else if (isAborted) continue;
				const currLen = payload.issues.length;
				const _ = ch._zod.check(payload);
				if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
				if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
					await _;
					const nextLen = payload.issues.length;
					if (nextLen === currLen) return;
					if (!isAborted) isAborted = aborted(payload, currLen);
				});
				else {
					const nextLen = payload.issues.length;
					if (nextLen === currLen) continue;
					if (!isAborted) isAborted = aborted(payload, currLen);
				}
			}
			if (asyncResult) return asyncResult.then(() => {
				return payload;
			});
			return payload;
		};
		inst._zod.run = (payload, ctx) => {
			const result = inst._zod.parse(payload, ctx);
			if (result instanceof Promise) {
				if (ctx.async === false) throw new $ZodAsyncError();
				return result.then((result$1) => runChecks(result$1, checks, ctx));
			}
			return runChecks(result, checks, ctx);
		};
	}
	inst["~standard"] = {
		validate: (value) => {
			try {
				const r = safeParse$1(inst, value);
				return r.success ? { value: r.data } : { issues: r.error?.issues };
			} catch (_) {
				return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
			}
		},
		vendor: "zod",
		version: 1
	};
});
const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
	inst._zod.parse = (payload, _) => {
		if (def.coerce) try {
			payload.value = String(payload.value);
		} catch (_$1) {}
		if (typeof payload.value === "string") return payload;
		payload.issues.push({
			expected: "string",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
	$ZodCheckStringFormat.init(inst, def);
	$ZodString.init(inst, def);
});
const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
	def.pattern ?? (def.pattern = guid);
	$ZodStringFormat.init(inst, def);
});
const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
	if (def.version) {
		const versionMap = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		};
		const v = versionMap[def.version];
		if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
		def.pattern ?? (def.pattern = uuid$1(v));
	} else def.pattern ?? (def.pattern = uuid$1());
	$ZodStringFormat.init(inst, def);
});
const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
	def.pattern ?? (def.pattern = email);
	$ZodStringFormat.init(inst, def);
});
const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		try {
			const trimmed = payload.value.trim();
			const url = new URL(trimmed);
			if (def.hostname) {
				def.hostname.lastIndex = 0;
				if (!def.hostname.test(url.hostname)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid hostname",
					pattern: hostname.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.protocol) {
				def.protocol.lastIndex = 0;
				if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid protocol",
					pattern: def.protocol.source,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			}
			if (def.normalize) payload.value = url.href;
			else payload.value = trimmed;
			return;
		} catch (_) {
			payload.issues.push({
				code: "invalid_format",
				format: "url",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
	def.pattern ?? (def.pattern = emoji());
	$ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
	def.pattern ?? (def.pattern = nanoid);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
	def.pattern ?? (def.pattern = cuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
	def.pattern ?? (def.pattern = cuid2);
	$ZodStringFormat.init(inst, def);
});
const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
	def.pattern ?? (def.pattern = ulid);
	$ZodStringFormat.init(inst, def);
});
const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
	def.pattern ?? (def.pattern = xid);
	$ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
	def.pattern ?? (def.pattern = ksuid);
	$ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
	def.pattern ?? (def.pattern = datetime$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
	def.pattern ?? (def.pattern = date$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
	def.pattern ?? (def.pattern = time$1(def));
	$ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
	def.pattern ?? (def.pattern = duration$1);
	$ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
	def.pattern ?? (def.pattern = ipv4);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = `ipv4`;
	});
});
const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
	def.pattern ?? (def.pattern = ipv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		const bag = inst$1._zod.bag;
		bag.format = `ipv6`;
	});
	inst._zod.check = (payload) => {
		try {
			new URL(`http://[${payload.value}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "ipv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv4);
	$ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
	def.pattern ?? (def.pattern = cidrv6);
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		const [address, prefix$1] = payload.value.split("/");
		try {
			if (!prefix$1) throw new Error();
			const prefixNum = Number(prefix$1);
			if (`${prefixNum}` !== prefix$1) throw new Error();
			if (prefixNum < 0 || prefixNum > 128) throw new Error();
			new URL(`http://[${address}]`);
		} catch {
			payload.issues.push({
				code: "invalid_format",
				format: "cidrv6",
				input: payload.value,
				inst,
				continue: !def.abort
			});
		}
	};
});
function isValidBase64(data) {
	if (data === "") return true;
	if (data.length % 4 !== 0) return false;
	try {
		atob(data);
		return true;
	} catch {
		return false;
	}
}
const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
	def.pattern ?? (def.pattern = base64);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		inst$1._zod.bag.contentEncoding = "base64";
	});
	inst._zod.check = (payload) => {
		if (isValidBase64(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
function isValidBase64URL(data) {
	if (!base64url.test(data)) return false;
	const base64$1 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
	const padded = base64$1.padEnd(Math.ceil(base64$1.length / 4) * 4, "=");
	return isValidBase64(padded);
}
const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
	def.pattern ?? (def.pattern = base64url);
	$ZodStringFormat.init(inst, def);
	inst._zod.onattach.push((inst$1) => {
		inst$1._zod.bag.contentEncoding = "base64url";
	});
	inst._zod.check = (payload) => {
		if (isValidBase64URL(payload.value)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
	def.pattern ?? (def.pattern = e164);
	$ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
	try {
		const tokensParts = token.split(".");
		if (tokensParts.length !== 3) return false;
		const [header] = tokensParts;
		if (!header) return false;
		const parsedHeader = JSON.parse(atob(header));
		if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
		if (!parsedHeader.alg) return false;
		if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
		return true;
	} catch {
		return false;
	}
}
const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	inst._zod.check = (payload) => {
		if (isValidJWT(payload.value, def.alg)) return;
		payload.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: payload.value,
			inst,
			continue: !def.abort
		});
	};
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Number(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
		const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
		payload.issues.push({
			expected: "number",
			code: "invalid_type",
			input,
			inst,
			...received ? { received } : {}
		});
		return payload;
	};
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
	$ZodCheckNumberFormat.init(inst, def);
	$ZodNumber.init(inst, def);
});
const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.pattern = boolean$1;
	inst._zod.parse = (payload, _ctx) => {
		if (def.coerce) try {
			payload.value = Boolean(payload.value);
		} catch (_) {}
		const input = payload.value;
		if (typeof input === "boolean") return payload;
		payload.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input,
			inst
		});
		return payload;
	};
});
const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload) => payload;
});
const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.issues.push({
			expected: "never",
			code: "invalid_type",
			input: payload.value,
			inst
		});
		return payload;
	};
});
function handleArrayResult(result, final, index) {
	if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
	final.value[index] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		if (!Array.isArray(input)) {
			payload.issues.push({
				expected: "array",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		payload.value = Array(input.length);
		const proms = [];
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const result = def.element._zod.run({
				value: item,
				issues: []
			}, ctx);
			if (result instanceof Promise) proms.push(result.then((result$1) => handleArrayResult(result$1, payload, i)));
			else handleArrayResult(result, payload, i);
		}
		if (proms.length) return Promise.all(proms).then(() => payload);
		return payload;
	};
});
function handlePropertyResult(result, final, key, input) {
	if (result.issues.length) final.issues.push(...prefixIssues(key, result.issues));
	if (result.value === void 0) {
		if (key in input) final.value[key] = void 0;
	} else final.value[key] = result.value;
}
const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
	$ZodType.init(inst, def);
	const _normalized = cached(() => {
		const keys = Object.keys(def.shape);
		for (const k of keys) if (!(def.shape[k] instanceof $ZodType)) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
		const okeys = optionalKeys(def.shape);
		return {
			shape: def.shape,
			keys,
			keySet: new Set(keys),
			numKeys: keys.length,
			optionalKeys: new Set(okeys)
		};
	});
	defineLazy(inst._zod, "propValues", () => {
		const shape = def.shape;
		const propValues = {};
		for (const key in shape) {
			const field = shape[key]._zod;
			if (field.values) {
				propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
				for (const v of field.values) propValues[key].add(v);
			}
		}
		return propValues;
	});
	const generateFastpass = (shape) => {
		const doc = new Doc([
			"shape",
			"payload",
			"ctx"
		]);
		const normalized = _normalized.value;
		const parseStr = (key) => {
			const k = esc(key);
			return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
		};
		doc.write(`const input = payload.value;`);
		const ids = Object.create(null);
		let counter = 0;
		for (const key of normalized.keys) ids[key] = `key_${counter++}`;
		doc.write(`const newResult = {}`);
		for (const key of normalized.keys) {
			const id = ids[key];
			const k = esc(key);
			doc.write(`const ${id} = ${parseStr(key)};`);
			doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
      `);
		}
		doc.write(`payload.value = newResult;`);
		doc.write(`return payload;`);
		const fn = doc.compile();
		return (payload, ctx) => fn(shape, payload, ctx);
	};
	let fastpass;
	const isObject$1 = isObject;
	const jit = !globalConfig.jitless;
	const allowsEval$1 = allowsEval;
	const fastEnabled = jit && allowsEval$1.value;
	const catchall = def.catchall;
	let value;
	inst._zod.parse = (payload, ctx) => {
		value ?? (value = _normalized.value);
		const input = payload.value;
		if (!isObject$1(input)) {
			payload.issues.push({
				expected: "object",
				code: "invalid_type",
				input,
				inst
			});
			return payload;
		}
		const proms = [];
		if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
			if (!fastpass) fastpass = generateFastpass(def.shape);
			payload = fastpass(payload, ctx);
		} else {
			payload.value = {};
			const shape = value.shape;
			for (const key of value.keys) {
				const el = shape[key];
				const r = el._zod.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r$1) => handlePropertyResult(r$1, payload, key, input)));
				else handlePropertyResult(r, payload, key, input);
			}
		}
		if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
		const unrecognized = [];
		const keySet = value.keySet;
		const _catchall = catchall._zod;
		const t = _catchall.def.type;
		for (const key of Object.keys(input)) {
			if (keySet.has(key)) continue;
			if (t === "never") {
				unrecognized.push(key);
				continue;
			}
			const r = _catchall.run({
				value: input[key],
				issues: []
			}, ctx);
			if (r instanceof Promise) proms.push(r.then((r$1) => handlePropertyResult(r$1, payload, key, input)));
			else handlePropertyResult(r, payload, key, input);
		}
		if (unrecognized.length) payload.issues.push({
			code: "unrecognized_keys",
			keys: unrecognized,
			input,
			inst
		});
		if (!proms.length) return payload;
		return Promise.all(proms).then(() => {
			return payload;
		});
	};
});
function handleUnionResults(results, final, inst, ctx) {
	for (const result of results) if (result.issues.length === 0) {
		final.value = result.value;
		return final;
	}
	const nonaborted = results.filter((r) => !aborted(r));
	if (nonaborted.length === 1) {
		final.value = nonaborted[0].value;
		return nonaborted[0];
	}
	final.issues.push({
		code: "invalid_union",
		input: final.value,
		inst,
		errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
	});
	return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
	defineLazy(inst._zod, "values", () => {
		if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
		return void 0;
	});
	defineLazy(inst._zod, "pattern", () => {
		if (def.options.every((o) => o._zod.pattern)) {
			const patterns = def.options.map((o) => o._zod.pattern);
			return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
		}
		return void 0;
	});
	const single = def.options.length === 1;
	const first = def.options[0]._zod.run;
	inst._zod.parse = (payload, ctx) => {
		if (single) return first(payload, ctx);
		let async = false;
		const results = [];
		for (const option of def.options) {
			const result = option._zod.run({
				value: payload.value,
				issues: []
			}, ctx);
			if (result instanceof Promise) {
				results.push(result);
				async = true;
			} else {
				if (result.issues.length === 0) return result;
				results.push(result);
			}
		}
		if (!async) return handleUnionResults(results, payload, inst, ctx);
		return Promise.all(results).then((results$1) => {
			return handleUnionResults(results$1, payload, inst, ctx);
		});
	};
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, ctx) => {
		const input = payload.value;
		const left = def.left._zod.run({
			value: input,
			issues: []
		}, ctx);
		const right = def.right._zod.run({
			value: input,
			issues: []
		}, ctx);
		const async = left instanceof Promise || right instanceof Promise;
		if (async) return Promise.all([left, right]).then(([left$1, right$1]) => {
			return handleIntersectionResults(payload, left$1, right$1);
		});
		return handleIntersectionResults(payload, left, right);
	};
});
function mergeValues(a, b) {
	if (a === b) return {
		valid: true,
		data: a
	};
	if (a instanceof Date && b instanceof Date && +a === +b) return {
		valid: true,
		data: a
	};
	if (isPlainObject(a) && isPlainObject(b)) {
		const bKeys = Object.keys(b);
		const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
		const newObj = {
			...a,
			...b
		};
		for (const key of sharedKeys) {
			const sharedValue = mergeValues(a[key], b[key]);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
			};
			newObj[key] = sharedValue.data;
		}
		return {
			valid: true,
			data: newObj
		};
	}
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return {
			valid: false,
			mergeErrorPath: []
		};
		const newArray = [];
		for (let index = 0; index < a.length; index++) {
			const itemA = a[index];
			const itemB = b[index];
			const sharedValue = mergeValues(itemA, itemB);
			if (!sharedValue.valid) return {
				valid: false,
				mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
			};
			newArray.push(sharedValue.data);
		}
		return {
			valid: true,
			data: newArray
		};
	}
	return {
		valid: false,
		mergeErrorPath: []
	};
}
function handleIntersectionResults(result, left, right) {
	if (left.issues.length) result.issues.push(...left.issues);
	if (right.issues.length) result.issues.push(...right.issues);
	if (aborted(result)) return result;
	const merged = mergeValues(left.value, right.value);
	if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
	result.value = merged.data;
	return result;
}
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
	$ZodType.init(inst, def);
	const values = getEnumValues(def.entries);
	const valuesSet = new Set(values);
	inst._zod.values = valuesSet;
	inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
	inst._zod.parse = (payload, _ctx) => {
		const input = payload.value;
		if (valuesSet.has(input)) return payload;
		payload.issues.push({
			code: "invalid_value",
			values,
			input,
			inst
		});
		return payload;
	};
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		const _out = def.transform(payload.value, payload);
		if (_ctx.async) {
			const output = _out instanceof Promise ? _out : Promise.resolve(_out);
			return output.then((output$1) => {
				payload.value = output$1;
				return payload;
			});
		}
		if (_out instanceof Promise) throw new $ZodAsyncError();
		payload.value = _out;
		return payload;
	};
});
function handleOptionalResult(result, input) {
	if (result.issues.length && input === void 0) return {
		issues: [],
		value: void 0
	};
	return result;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	inst._zod.optout = "optional";
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? new Set([...def.innerType._zod.values, void 0]) : void 0;
	});
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (def.innerType._zod.optin === "optional") {
			const result = def.innerType._zod.run(payload, ctx);
			if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, payload.value));
			return handleOptionalResult(result, payload.value);
		}
		if (payload.value === void 0) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "pattern", () => {
		const pattern = def.innerType._zod.pattern;
		return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
	});
	defineLazy(inst._zod, "values", () => {
		return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === null) return payload;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === void 0) {
			payload.value = def.defaultValue;
			/**
			* $ZodDefault always returns the default value immediately.
			* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
			return payload;
		}
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result$1) => handleDefaultResult(result$1, def));
		return handleDefaultResult(result, def);
	};
});
function handleDefaultResult(payload, def) {
	if (payload.value === void 0) payload.value = def.defaultValue;
	return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
	$ZodType.init(inst, def);
	inst._zod.optin = "optional";
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		if (payload.value === void 0) payload.value = def.defaultValue;
		return def.innerType._zod.run(payload, ctx);
	};
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => {
		const v = def.innerType._zod.values;
		return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
	});
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result$1) => handleNonOptionalResult(result$1, inst));
		return handleNonOptionalResult(result, inst);
	};
});
function handleNonOptionalResult(payload, inst) {
	if (!payload.issues.length && payload.value === void 0) payload.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: payload.value,
		inst
	});
	return payload;
}
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then((result$1) => {
			payload.value = result$1.value;
			if (result$1.issues.length) {
				payload.value = def.catchValue({
					...payload,
					error: { issues: result$1.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
					input: payload.value
				});
				payload.issues = [];
			}
			return payload;
		});
		payload.value = result.value;
		if (result.issues.length) {
			payload.value = def.catchValue({
				...payload,
				error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
				input: payload.value
			});
			payload.issues = [];
		}
		return payload;
	};
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "values", () => def.in._zod.values);
	defineLazy(inst._zod, "optin", () => def.in._zod.optin);
	defineLazy(inst._zod, "optout", () => def.out._zod.optout);
	defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
	inst._zod.parse = (payload, ctx) => {
		const left = def.in._zod.run(payload, ctx);
		if (left instanceof Promise) return left.then((left$1) => handlePipeResult(left$1, def, ctx));
		return handlePipeResult(left, def, ctx);
	};
});
function handlePipeResult(left, def, ctx) {
	if (left.issues.length) return left;
	return def.out._zod.run({
		value: left.value,
		issues: left.issues
	}, ctx);
}
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
	$ZodType.init(inst, def);
	defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
	defineLazy(inst._zod, "values", () => def.innerType._zod.values);
	defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
	defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
	inst._zod.parse = (payload, ctx) => {
		const result = def.innerType._zod.run(payload, ctx);
		if (result instanceof Promise) return result.then(handleReadonlyResult);
		return handleReadonlyResult(result);
	};
});
function handleReadonlyResult(payload) {
	payload.value = Object.freeze(payload.value);
	return payload;
}
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
	$ZodCheck.init(inst, def);
	$ZodType.init(inst, def);
	inst._zod.parse = (payload, _) => {
		return payload;
	};
	inst._zod.check = (payload) => {
		const input = payload.value;
		const r = def.fn(input);
		if (r instanceof Promise) return r.then((r$1) => handleRefineResult(r$1, payload, input, inst));
		handleRefineResult(r, payload, input, inst);
		return;
	};
});
function handleRefineResult(result, payload, input, inst) {
	if (!result) {
		const _iss = {
			code: "custom",
			input,
			inst,
			path: [...inst._zod.def.path ?? []],
			continue: !inst._zod.def.abort
		};
		if (inst._zod.def.params) _iss.params = inst._zod.def.params;
		payload.issues.push(issue(_iss));
	}
}

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/registries.js
const $output = Symbol("ZodOutput");
const $input = Symbol("ZodInput");
var $ZodRegistry = class {
	constructor() {
		this._map = /* @__PURE__ */ new Map();
		this._idmap = /* @__PURE__ */ new Map();
	}
	add(schema, ..._meta) {
		const meta = _meta[0];
		this._map.set(schema, meta);
		if (meta && typeof meta === "object" && "id" in meta) {
			if (this._idmap.has(meta.id)) throw new Error(`ID ${meta.id} already exists in the registry`);
			this._idmap.set(meta.id, schema);
		}
		return this;
	}
	clear() {
		this._map = /* @__PURE__ */ new Map();
		this._idmap = /* @__PURE__ */ new Map();
		return this;
	}
	remove(schema) {
		const meta = this._map.get(schema);
		if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
		this._map.delete(schema);
		return this;
	}
	get(schema) {
		const p = schema._zod.parent;
		if (p) {
			const pm = { ...this.get(p) ?? {} };
			delete pm.id;
			const f = {
				...pm,
				...this._map.get(schema)
			};
			return Object.keys(f).length ? f : void 0;
		}
		return this._map.get(schema);
	}
	has(schema) {
		return this._map.has(schema);
	}
};
function registry() {
	return new $ZodRegistry();
}
const globalRegistry = /* @__PURE__ */ registry();

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/core/api.js
function _string(Class, params) {
	return new Class({
		type: "string",
		...normalizeParams(params)
	});
}
function _email(Class, params) {
	return new Class({
		type: "string",
		format: "email",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _guid(Class, params) {
	return new Class({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _uuid(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _uuidv4(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v4",
		...normalizeParams(params)
	});
}
function _uuidv6(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v6",
		...normalizeParams(params)
	});
}
function _uuidv7(Class, params) {
	return new Class({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: false,
		version: "v7",
		...normalizeParams(params)
	});
}
function _url(Class, params) {
	return new Class({
		type: "string",
		format: "url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _emoji(Class, params) {
	return new Class({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _nanoid(Class, params) {
	return new Class({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cuid(Class, params) {
	return new Class({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cuid2(Class, params) {
	return new Class({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ulid(Class, params) {
	return new Class({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _xid(Class, params) {
	return new Class({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ksuid(Class, params) {
	return new Class({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ipv4(Class, params) {
	return new Class({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _ipv6(Class, params) {
	return new Class({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cidrv4(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _cidrv6(Class, params) {
	return new Class({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _base64(Class, params) {
	return new Class({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _base64url(Class, params) {
	return new Class({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _e164(Class, params) {
	return new Class({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _jwt(Class, params) {
	return new Class({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: false,
		...normalizeParams(params)
	});
}
function _isoDateTime(Class, params) {
	return new Class({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: false,
		local: false,
		precision: null,
		...normalizeParams(params)
	});
}
function _isoDate(Class, params) {
	return new Class({
		type: "string",
		format: "date",
		check: "string_format",
		...normalizeParams(params)
	});
}
function _isoTime(Class, params) {
	return new Class({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...normalizeParams(params)
	});
}
function _isoDuration(Class, params) {
	return new Class({
		type: "string",
		format: "duration",
		check: "string_format",
		...normalizeParams(params)
	});
}
function _number(Class, params) {
	return new Class({
		type: "number",
		checks: [],
		...normalizeParams(params)
	});
}
function _int(Class, params) {
	return new Class({
		type: "number",
		check: "number_format",
		abort: false,
		format: "safeint",
		...normalizeParams(params)
	});
}
function _boolean(Class, params) {
	return new Class({
		type: "boolean",
		...normalizeParams(params)
	});
}
function _unknown(Class) {
	return new Class({ type: "unknown" });
}
function _never(Class, params) {
	return new Class({
		type: "never",
		...normalizeParams(params)
	});
}
function _lt(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
function _lte(value, params) {
	return new $ZodCheckLessThan({
		check: "less_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
function _gt(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: false
	});
}
function _gte(value, params) {
	return new $ZodCheckGreaterThan({
		check: "greater_than",
		...normalizeParams(params),
		value,
		inclusive: true
	});
}
function _multipleOf(value, params) {
	return new $ZodCheckMultipleOf({
		check: "multiple_of",
		...normalizeParams(params),
		value
	});
}
function _maxLength(maximum, params) {
	const ch = new $ZodCheckMaxLength({
		check: "max_length",
		...normalizeParams(params),
		maximum
	});
	return ch;
}
function _minLength(minimum, params) {
	return new $ZodCheckMinLength({
		check: "min_length",
		...normalizeParams(params),
		minimum
	});
}
function _length(length, params) {
	return new $ZodCheckLengthEquals({
		check: "length_equals",
		...normalizeParams(params),
		length
	});
}
function _regex(pattern, params) {
	return new $ZodCheckRegex({
		check: "string_format",
		format: "regex",
		...normalizeParams(params),
		pattern
	});
}
function _lowercase(params) {
	return new $ZodCheckLowerCase({
		check: "string_format",
		format: "lowercase",
		...normalizeParams(params)
	});
}
function _uppercase(params) {
	return new $ZodCheckUpperCase({
		check: "string_format",
		format: "uppercase",
		...normalizeParams(params)
	});
}
function _includes(includes, params) {
	return new $ZodCheckIncludes({
		check: "string_format",
		format: "includes",
		...normalizeParams(params),
		includes
	});
}
function _startsWith(prefix$1, params) {
	return new $ZodCheckStartsWith({
		check: "string_format",
		format: "starts_with",
		...normalizeParams(params),
		prefix: prefix$1
	});
}
function _endsWith(suffix, params) {
	return new $ZodCheckEndsWith({
		check: "string_format",
		format: "ends_with",
		...normalizeParams(params),
		suffix
	});
}
function _overwrite(tx) {
	return new $ZodCheckOverwrite({
		check: "overwrite",
		tx
	});
}
function _normalize(form) {
	return _overwrite((input) => input.normalize(form));
}
function _trim() {
	return _overwrite((input) => input.trim());
}
function _toLowerCase() {
	return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
	return _overwrite((input) => input.toUpperCase());
}
function _array(Class, element, params) {
	return new Class({
		type: "array",
		element,
		...normalizeParams(params)
	});
}
function _refine(Class, fn, _params) {
	const schema = new Class({
		type: "custom",
		check: "custom",
		fn,
		...normalizeParams(_params)
	});
	return schema;
}
function _superRefine(fn) {
	const ch = _check((payload) => {
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = ch);
				_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
				payload.issues.push(issue(_issue));
			}
		};
		return fn(payload.value, payload);
	});
	return ch;
}
function _check(fn, params) {
	const ch = new $ZodCheck({
		check: "custom",
		...normalizeParams(params)
	});
	ch._zod.check = fn;
	return ch;
}

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/classic/iso.js
const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
	$ZodISODateTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function datetime(params) {
	return _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
	$ZodISODate.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function date(params) {
	return _isoDate(ZodISODate, params);
}
const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
	$ZodISOTime.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function time(params) {
	return _isoTime(ZodISOTime, params);
}
const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
	$ZodISODuration.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function duration(params) {
	return _isoDuration(ZodISODuration, params);
}

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/classic/errors.js
const initializer = (inst, issues) => {
	$ZodError.init(inst, issues);
	inst.name = "ZodError";
	Object.defineProperties(inst, {
		format: { value: (mapper) => formatError(inst, mapper) },
		flatten: { value: (mapper) => flattenError(inst, mapper) },
		addIssue: { value: (issue$1) => {
			inst.issues.push(issue$1);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		addIssues: { value: (issues$1) => {
			inst.issues.push(...issues$1);
			inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
		} },
		isEmpty: { get() {
			return inst.issues.length === 0;
		} }
	});
};
const ZodError = $constructor("ZodError", initializer);
const ZodRealError = $constructor("ZodError", initializer, { Parent: Error });

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/classic/parse.js
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);

//#endregion
//#region ../../node_modules/.pnpm/zod@4.0.14/node_modules/zod/v4/classic/schemas.js
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
	$ZodType.init(inst, def);
	inst.def = def;
	Object.defineProperty(inst, "_def", { value: def });
	inst.check = (...checks) => {
		return inst.clone({
			...def,
			checks: [...def.checks ?? [], ...checks.map((ch) => typeof ch === "function" ? { _zod: {
				check: ch,
				def: { check: "custom" },
				onattach: []
			} } : ch)]
		});
	};
	inst.clone = (def$1, params) => clone(inst, def$1, params);
	inst.brand = () => inst;
	inst.register = (reg, meta) => {
		reg.add(inst, meta);
		return inst;
	};
	inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
	inst.safeParse = (data, params) => safeParse(inst, data, params);
	inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
	inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
	inst.spa = inst.safeParseAsync;
	inst.refine = (check, params) => inst.check(refine(check, params));
	inst.superRefine = (refinement) => inst.check(superRefine(refinement));
	inst.overwrite = (fn) => inst.check(_overwrite(fn));
	inst.optional = () => optional(inst);
	inst.nullable = () => nullable(inst);
	inst.nullish = () => optional(nullable(inst));
	inst.nonoptional = (params) => nonoptional(inst, params);
	inst.array = () => array(inst);
	inst.or = (arg) => union([inst, arg]);
	inst.and = (arg) => intersection(inst, arg);
	inst.transform = (tx) => pipe(inst, transform(tx));
	inst.default = (def$1) => _default(inst, def$1);
	inst.prefault = (def$1) => prefault(inst, def$1);
	inst.catch = (params) => _catch(inst, params);
	inst.pipe = (target) => pipe(inst, target);
	inst.readonly = () => readonly(inst);
	inst.describe = (description) => {
		const cl = inst.clone();
		globalRegistry.add(cl, { description });
		return cl;
	};
	Object.defineProperty(inst, "description", {
		get() {
			return globalRegistry.get(inst)?.description;
		},
		configurable: true
	});
	inst.meta = (...args) => {
		if (args.length === 0) return globalRegistry.get(inst);
		const cl = inst.clone();
		globalRegistry.add(cl, args[0]);
		return cl;
	};
	inst.isOptional = () => inst.safeParse(void 0).success;
	inst.isNullable = () => inst.safeParse(null).success;
	return inst;
});
/** @internal */
const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	ZodType.init(inst, def);
	const bag = inst._zod.bag;
	inst.format = bag.format ?? null;
	inst.minLength = bag.minimum ?? null;
	inst.maxLength = bag.maximum ?? null;
	inst.regex = (...args) => inst.check(_regex(...args));
	inst.includes = (...args) => inst.check(_includes(...args));
	inst.startsWith = (...args) => inst.check(_startsWith(...args));
	inst.endsWith = (...args) => inst.check(_endsWith(...args));
	inst.min = (...args) => inst.check(_minLength(...args));
	inst.max = (...args) => inst.check(_maxLength(...args));
	inst.length = (...args) => inst.check(_length(...args));
	inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
	inst.lowercase = (params) => inst.check(_lowercase(params));
	inst.uppercase = (params) => inst.check(_uppercase(params));
	inst.trim = () => inst.check(_trim());
	inst.normalize = (...args) => inst.check(_normalize(...args));
	inst.toLowerCase = () => inst.check(_toLowerCase());
	inst.toUpperCase = () => inst.check(_toUpperCase());
});
const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
	$ZodString.init(inst, def);
	_ZodString.init(inst, def);
	inst.email = (params) => inst.check(_email(ZodEmail, params));
	inst.url = (params) => inst.check(_url(ZodURL, params));
	inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
	inst.emoji = (params) => inst.check(_emoji(ZodEmoji, params));
	inst.guid = (params) => inst.check(_guid(ZodGUID, params));
	inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
	inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
	inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
	inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
	inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
	inst.guid = (params) => inst.check(_guid(ZodGUID, params));
	inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
	inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
	inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
	inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
	inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
	inst.xid = (params) => inst.check(_xid(ZodXID, params));
	inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
	inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
	inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
	inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
	inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
	inst.e164 = (params) => inst.check(_e164(ZodE164, params));
	inst.datetime = (params) => inst.check(datetime(params));
	inst.date = (params) => inst.check(date(params));
	inst.time = (params) => inst.check(time(params));
	inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
	return _string(ZodString, params);
}
const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
	$ZodStringFormat.init(inst, def);
	_ZodString.init(inst, def);
});
const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
	$ZodEmail.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
	$ZodGUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
	$ZodUUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
function uuid(params) {
	return _uuid(ZodUUID, params);
}
const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
	$ZodURL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
	$ZodEmoji.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
	$ZodNanoID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
	$ZodCUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
	$ZodCUID2.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
	$ZodULID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
	$ZodXID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
	$ZodKSUID.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
	$ZodIPv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
	$ZodIPv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
	$ZodCIDRv4.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
	$ZodCIDRv6.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
	$ZodBase64.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
	$ZodBase64URL.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
	$ZodE164.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
	$ZodJWT.init(inst, def);
	ZodStringFormat.init(inst, def);
});
const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
	$ZodNumber.init(inst, def);
	ZodType.init(inst, def);
	inst.gt = (value, params) => inst.check(_gt(value, params));
	inst.gte = (value, params) => inst.check(_gte(value, params));
	inst.min = (value, params) => inst.check(_gte(value, params));
	inst.lt = (value, params) => inst.check(_lt(value, params));
	inst.lte = (value, params) => inst.check(_lte(value, params));
	inst.max = (value, params) => inst.check(_lte(value, params));
	inst.int = (params) => inst.check(int(params));
	inst.safe = (params) => inst.check(int(params));
	inst.positive = (params) => inst.check(_gt(0, params));
	inst.nonnegative = (params) => inst.check(_gte(0, params));
	inst.negative = (params) => inst.check(_lt(0, params));
	inst.nonpositive = (params) => inst.check(_lte(0, params));
	inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
	inst.step = (value, params) => inst.check(_multipleOf(value, params));
	inst.finite = () => inst;
	const bag = inst._zod.bag;
	inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
	inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
	inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
	inst.isFinite = true;
	inst.format = bag.format ?? null;
});
function number(params) {
	return _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
	$ZodNumberFormat.init(inst, def);
	ZodNumber.init(inst, def);
});
function int(params) {
	return _int(ZodNumberFormat, params);
}
const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
	$ZodBoolean.init(inst, def);
	ZodType.init(inst, def);
});
function boolean(params) {
	return _boolean(ZodBoolean, params);
}
const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
	$ZodUnknown.init(inst, def);
	ZodType.init(inst, def);
});
function unknown() {
	return _unknown(ZodUnknown);
}
const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
	$ZodNever.init(inst, def);
	ZodType.init(inst, def);
});
function never(params) {
	return _never(ZodNever, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
	$ZodArray.init(inst, def);
	ZodType.init(inst, def);
	inst.element = def.element;
	inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
	inst.nonempty = (params) => inst.check(_minLength(1, params));
	inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
	inst.length = (len, params) => inst.check(_length(len, params));
	inst.unwrap = () => inst.element;
});
function array(element, params) {
	return _array(ZodArray, element, params);
}
const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
	$ZodObject.init(inst, def);
	ZodType.init(inst, def);
	defineLazy(inst, "shape", () => def.shape);
	inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
	inst.catchall = (catchall) => inst.clone({
		...inst._zod.def,
		catchall
	});
	inst.passthrough = () => inst.clone({
		...inst._zod.def,
		catchall: unknown()
	});
	inst.loose = () => inst.clone({
		...inst._zod.def,
		catchall: unknown()
	});
	inst.strict = () => inst.clone({
		...inst._zod.def,
		catchall: never()
	});
	inst.strip = () => inst.clone({
		...inst._zod.def,
		catchall: void 0
	});
	inst.extend = (incoming) => {
		return extend(inst, incoming);
	};
	inst.merge = (other) => merge(inst, other);
	inst.pick = (mask) => pick(inst, mask);
	inst.omit = (mask) => omit(inst, mask);
	inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
	inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
	const def = {
		type: "object",
		get shape() {
			assignProp(this, "shape", { ...shape });
			return this.shape;
		},
		...normalizeParams(params)
	};
	return new ZodObject(def);
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
	$ZodUnion.init(inst, def);
	ZodType.init(inst, def);
	inst.options = def.options;
});
function union(options, params) {
	return new ZodUnion({
		type: "union",
		options,
		...normalizeParams(params)
	});
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
	$ZodIntersection.init(inst, def);
	ZodType.init(inst, def);
});
function intersection(left, right) {
	return new ZodIntersection({
		type: "intersection",
		left,
		right
	});
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
	$ZodEnum.init(inst, def);
	ZodType.init(inst, def);
	inst.enum = def.entries;
	inst.options = Object.values(def.entries);
	const keys = new Set(Object.keys(def.entries));
	inst.extract = (values, params) => {
		const newEntries = {};
		for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
	inst.exclude = (values, params) => {
		const newEntries = { ...def.entries };
		for (const value of values) if (keys.has(value)) delete newEntries[value];
		else throw new Error(`Key ${value} not found in enum`);
		return new ZodEnum({
			...def,
			checks: [],
			...normalizeParams(params),
			entries: newEntries
		});
	};
});
function _enum(values, params) {
	const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
	return new ZodEnum({
		type: "enum",
		entries,
		...normalizeParams(params)
	});
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
	$ZodTransform.init(inst, def);
	ZodType.init(inst, def);
	inst._zod.parse = (payload, _ctx) => {
		payload.addIssue = (issue$1) => {
			if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
			else {
				const _issue = issue$1;
				if (_issue.fatal) _issue.continue = false;
				_issue.code ?? (_issue.code = "custom");
				_issue.input ?? (_issue.input = payload.value);
				_issue.inst ?? (_issue.inst = inst);
				payload.issues.push(issue(_issue));
			}
		};
		const output = def.transform(payload.value, payload);
		if (output instanceof Promise) return output.then((output$1) => {
			payload.value = output$1;
			return payload;
		});
		payload.value = output;
		return payload;
	};
});
function transform(fn) {
	return new ZodTransform({
		type: "transform",
		transform: fn
	});
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
	$ZodOptional.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
	return new ZodOptional({
		type: "optional",
		innerType
	});
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
	$ZodNullable.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
	return new ZodNullable({
		type: "nullable",
		innerType
	});
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
	$ZodDefault.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
	return new ZodDefault({
		type: "default",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : defaultValue;
		}
	});
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
	$ZodPrefault.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
	return new ZodPrefault({
		type: "prefault",
		innerType,
		get defaultValue() {
			return typeof defaultValue === "function" ? defaultValue() : defaultValue;
		}
	});
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
	$ZodNonOptional.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
	return new ZodNonOptional({
		type: "nonoptional",
		innerType,
		...normalizeParams(params)
	});
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
	$ZodCatch.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
	inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
	return new ZodCatch({
		type: "catch",
		innerType,
		catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
	});
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
	$ZodPipe.init(inst, def);
	ZodType.init(inst, def);
	inst.in = def.in;
	inst.out = def.out;
});
function pipe(in_, out) {
	return new ZodPipe({
		type: "pipe",
		in: in_,
		out
	});
}
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
	$ZodReadonly.init(inst, def);
	ZodType.init(inst, def);
	inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
	return new ZodReadonly({
		type: "readonly",
		innerType
	});
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
	$ZodCustom.init(inst, def);
	ZodType.init(inst, def);
});
function refine(fn, _params = {}) {
	return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
	return _superRefine(fn);
}

//#endregion
//#region ../@core/src/kwil-actions/actions.ts
const DataType = Utils.DataType;
const actionSchema = {
	add_inserter_as_owner: [{
		name: "id",
		type: DataType.Uuid
	}, {
		name: "name",
		type: DataType.Text
	}],
	delete_inserter_as_owner: [{
		name: "id",
		type: DataType.Uuid
	}],
	add_delegate_as_owner: [{
		name: "address",
		type: DataType.Text
	}, {
		name: "inserter_id",
		type: DataType.Uuid
	}],
	delete_delegate_as_owner: [{
		name: "address",
		type: DataType.Text
	}],
	get_inserter: [],
	get_inserter_or_null: [],
	add_user_as_inserter: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "recipient_encryption_public_key",
			type: DataType.Text
		},
		{
			name: "encryption_password_store",
			type: DataType.Text
		}
	],
	update_user_pub_key_as_inserter: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "recipient_encryption_public_key",
			type: DataType.Text
		},
		{
			name: "encryption_password_store",
			type: DataType.Text
		}
	],
	get_user: [],
	get_user_as_inserter: [{
		name: "id",
		type: DataType.Uuid
	}],
	upsert_wallet_as_inserter: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "user_id",
			type: DataType.Uuid
		},
		{
			name: "address",
			type: DataType.Text
		},
		{
			name: "public_key",
			type: DataType.Text
		},
		{
			name: "wallet_type",
			type: DataType.Text
		},
		{
			name: "message",
			type: DataType.Text
		},
		{
			name: "signature",
			type: DataType.Text
		}
	],
	add_wallet: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "address",
			type: DataType.Text
		},
		{
			name: "public_key",
			type: DataType.Text
		},
		{
			name: "message",
			type: DataType.Text
		},
		{
			name: "signature",
			type: DataType.Text
		}
	],
	get_wallets: [],
	remove_wallet: [{
		name: "id",
		type: DataType.Uuid
	}],
	upsert_credential_as_inserter: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "user_id",
			type: DataType.Uuid
		},
		{
			name: "issuer_auth_public_key",
			type: DataType.Text
		},
		{
			name: "encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "content",
			type: DataType.Text
		},
		{
			name: "public_notes",
			type: DataType.Text
		},
		{
			name: "public_notes_signature",
			type: DataType.Text
		},
		{
			name: "broader_signature",
			type: DataType.Text
		}
	],
	add_credential: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "issuer_auth_public_key",
			type: DataType.Text
		},
		{
			name: "encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "content",
			type: DataType.Text
		},
		{
			name: "public_notes",
			type: DataType.Text
		},
		{
			name: "public_notes_signature",
			type: DataType.Text
		},
		{
			name: "broader_signature",
			type: DataType.Text
		}
	],
	get_credentials: [],
	get_credentials_shared_by_user: [{
		name: "user_id",
		type: DataType.Uuid
	}, {
		name: "issuer_auth_public_key",
		type: DataType.Text
	}],
	edit_credential: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "public_notes",
			type: DataType.Text
		},
		{
			name: "public_notes_signature",
			type: DataType.Text
		},
		{
			name: "broader_signature",
			type: DataType.Text
		},
		{
			name: "content",
			type: DataType.Text
		},
		{
			name: "encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "issuer_auth_public_key",
			type: DataType.Text
		}
	],
	edit_public_notes_as_issuer: [{
		name: "public_notes_id",
		type: DataType.Text
	}, {
		name: "public_notes",
		type: DataType.Text
	}],
	remove_credential: [{
		name: "id",
		type: DataType.Uuid
	}],
	rescind_shared_credential: [{
		name: "credential_id",
		type: DataType.Uuid
	}],
	share_credential: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "original_credential_id",
			type: DataType.Uuid
		},
		{
			name: "public_notes",
			type: DataType.Text
		},
		{
			name: "public_notes_signature",
			type: DataType.Text
		},
		{
			name: "broader_signature",
			type: DataType.Text
		},
		{
			name: "content",
			type: DataType.Text
		},
		{
			name: "content_hash",
			type: DataType.Text
		},
		{
			name: "encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "issuer_auth_public_key",
			type: DataType.Text
		},
		{
			name: "grantee_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "locked_until",
			type: DataType.Int
		}
	],
	create_credential_copy: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "original_credential_id",
			type: DataType.Uuid
		},
		{
			name: "public_notes",
			type: DataType.Text
		},
		{
			name: "public_notes_signature",
			type: DataType.Text
		},
		{
			name: "broader_signature",
			type: DataType.Text
		},
		{
			name: "content",
			type: DataType.Text
		},
		{
			name: "encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "issuer_auth_public_key",
			type: DataType.Text
		}
	],
	share_credential_through_dag: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "user_id",
			type: DataType.Uuid
		},
		{
			name: "issuer_auth_public_key",
			type: DataType.Text
		},
		{
			name: "encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "content",
			type: DataType.Text
		},
		{
			name: "content_hash",
			type: DataType.Text
		},
		{
			name: "public_notes",
			type: DataType.Text
		},
		{
			name: "public_notes_signature",
			type: DataType.Text
		},
		{
			name: "broader_signature",
			type: DataType.Text
		},
		{
			name: "original_credential_id",
			type: DataType.Uuid
		},
		{
			name: "dag_owner_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "dag_grantee_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "dag_locked_until",
			type: DataType.Int
		},
		{
			name: "dag_signature",
			type: DataType.Text
		}
	],
	create_credentials_by_dwg: [
		{
			name: "issuer_auth_public_key",
			type: DataType.Text
		},
		{
			name: "original_encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "original_credential_id",
			type: DataType.Uuid
		},
		{
			name: "original_content",
			type: DataType.Text
		},
		{
			name: "original_public_notes",
			type: DataType.Text
		},
		{
			name: "original_public_notes_signature",
			type: DataType.Text
		},
		{
			name: "original_broader_signature",
			type: DataType.Text
		},
		{
			name: "copy_encryptor_public_key",
			type: DataType.Text
		},
		{
			name: "copy_credential_id",
			type: DataType.Uuid
		},
		{
			name: "copy_content",
			type: DataType.Text
		},
		{
			name: "copy_public_notes_signature",
			type: DataType.Text
		},
		{
			name: "copy_broader_signature",
			type: DataType.Text
		},
		{
			name: "content_hash",
			type: DataType.Text
		},
		{
			name: "dwg_owner",
			type: DataType.Text
		},
		{
			name: "dwg_grantee",
			type: DataType.Text
		},
		{
			name: "dwg_issuer_public_key",
			type: DataType.Text
		},
		{
			name: "dwg_id",
			type: DataType.Uuid
		},
		{
			name: "dwg_access_grant_timelock",
			type: DataType.Text
		},
		{
			name: "dwg_not_before",
			type: DataType.Text
		},
		{
			name: "dwg_not_after",
			type: DataType.Text
		},
		{
			name: "dwg_signature",
			type: DataType.Text
		}
	],
	credential_exist_as_inserter: [{
		name: "id",
		type: DataType.Uuid
	}],
	get_credential_owned: [{
		name: "id",
		type: DataType.Uuid
	}],
	get_credential_shared: [{
		name: "id",
		type: DataType.Uuid
	}],
	get_sibling_credential_id: [{
		name: "content_hash",
		type: DataType.Text
	}],
	credential_belongs_to_caller: [{
		name: "id",
		type: DataType.Uuid
	}],
	credential_exist: [{
		name: "id",
		type: DataType.Uuid
	}],
	add_attribute_as_inserter: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "user_id",
			type: DataType.Uuid
		},
		{
			name: "attribute_key",
			type: DataType.Text
		},
		{
			name: "value",
			type: DataType.Text
		}
	],
	add_attribute: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "attribute_key",
			type: DataType.Text
		},
		{
			name: "value",
			type: DataType.Text
		}
	],
	get_attributes: [],
	edit_attribute: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "attribute_key",
			type: DataType.Text
		},
		{
			name: "value",
			type: DataType.Text
		}
	],
	remove_attribute: [{
		name: "id",
		type: DataType.Uuid
	}],
	share_attribute: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "original_attribute_id",
			type: DataType.Uuid
		},
		{
			name: "attribute_key",
			type: DataType.Text
		},
		{
			name: "value",
			type: DataType.Text
		}
	],
	dwg_message: [
		{
			name: "owner_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "grantee_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "issuer_public_key",
			type: DataType.Text
		},
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "access_grant_timelock",
			type: DataType.Text
		},
		{
			name: "not_usable_before",
			type: DataType.Text
		},
		{
			name: "not_usable_after",
			type: DataType.Text
		}
	],
	revoke_access_grant: [{
		name: "id",
		type: DataType.Uuid
	}],
	get_access_grants_owned: [],
	get_access_grants_granted: [
		{
			name: "user_id",
			type: DataType.Uuid
		},
		{
			name: "page",
			type: DataType.Int
		},
		{
			name: "size",
			type: DataType.Int
		}
	],
	get_access_grants_granted_count: [{
		name: "user_id",
		type: DataType.Uuid
	}],
	has_locked_access_grants: [{
		name: "id",
		type: DataType.Uuid
	}],
	dag_message: [
		{
			name: "dag_owner_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "dag_grantee_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "dag_data_id",
			type: DataType.Uuid
		},
		{
			name: "dag_locked_until",
			type: DataType.Int
		},
		{
			name: "dag_content_hash",
			type: DataType.Text
		}
	],
	create_ag_by_dag_for_copy: [
		{
			name: "dag_owner_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "dag_grantee_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "dag_data_id",
			type: DataType.Uuid
		},
		{
			name: "dag_locked_until",
			type: DataType.Int
		},
		{
			name: "dag_content_hash",
			type: DataType.Text
		},
		{
			name: "dag_signature",
			type: DataType.Text
		}
	],
	create_access_grant: [
		{
			name: "grantee_wallet_identifier",
			type: DataType.Text
		},
		{
			name: "data_id",
			type: DataType.Uuid
		},
		{
			name: "locked_until",
			type: DataType.Int
		},
		{
			name: "content_hash",
			type: DataType.Text
		},
		{
			name: "inserter_type",
			type: DataType.Text
		},
		{
			name: "inserter_id",
			type: DataType.Text
		}
	],
	get_access_grants_for_credential: [{
		name: "credential_id",
		type: DataType.Uuid
	}],
	has_profile: [{
		name: "address",
		type: DataType.Text
	}],
	add_passporting_club_as_owner: [{
		name: "id",
		type: DataType.Uuid
	}, {
		name: "name",
		type: DataType.Text
	}],
	delete_passporting_club_as_owner: [{
		name: "id",
		type: DataType.Uuid
	}],
	add_passporting_peer_as_owner: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "name",
			type: DataType.Text
		},
		{
			name: "issuer_public_key",
			type: DataType.Text
		},
		{
			name: "passporting_server_url_base",
			type: DataType.Text
		}
	],
	delete_passporting_peer_as_owner: [{
		name: "id",
		type: DataType.Uuid
	}],
	update_passporting_peer_as_owner: [
		{
			name: "id",
			type: DataType.Uuid
		},
		{
			name: "name",
			type: DataType.Text
		},
		{
			name: "issuer_public_key",
			type: DataType.Text
		},
		{
			name: "passporting_server_url_base",
			type: DataType.Text
		}
	],
	add_peer_to_club_as_owner: [{
		name: "passporting_club_id",
		type: DataType.Uuid
	}, {
		name: "passporting_peer_id",
		type: DataType.Uuid
	}],
	delete_peer_from_club_as_owner: [{
		name: "passporting_club_id",
		type: DataType.Uuid
	}, {
		name: "passporting_peer_id",
		type: DataType.Uuid
	}],
	get_passporting_peers: []
};
const AddInserterAsOwnerInputSchema = object({
	id: uuid(),
	name: string()
});
const DeleteInserterAsOwnerInputSchema = object({ id: uuid() });
const AddDelegateAsOwnerInputSchema = object({
	address: string(),
	inserter_id: uuid()
});
const DeleteDelegateAsOwnerInputSchema = object({ address: string() });
const GetInserterOutputSchema = object({ name: string() });
const GetInserterOrNullOutputSchema = object({ name: string() });
const AddUserAsInserterInputSchema = object({
	id: uuid(),
	recipient_encryption_public_key: string(),
	encryption_password_store: string()
});
const UpdateUserPubKeyAsInserterInputSchema = object({
	id: uuid(),
	recipient_encryption_public_key: string(),
	encryption_password_store: string()
});
const GetUserOutputSchema = object({
	id: uuid(),
	recipient_encryption_public_key: string(),
	encryption_password_store: string()
});
const GetUserAsInserterInputSchema = object({ id: uuid() });
const GetUserAsInserterOutputSchema = object({
	id: uuid(),
	recipient_encryption_public_key: string(),
	encryption_password_store: string(),
	inserter: string()
});
const UpsertWalletAsInserterInputSchema = object({
	id: uuid(),
	user_id: uuid(),
	address: string(),
	public_key: string(),
	wallet_type: string(),
	message: string(),
	signature: string()
});
const AddWalletInputSchema = object({
	id: uuid(),
	address: string(),
	public_key: string(),
	message: string(),
	signature: string()
});
const GetWalletsOutputSchema = object({
	id: uuid(),
	user_id: uuid(),
	address: string(),
	public_key: string(),
	wallet_type: string(),
	message: string(),
	signature: string(),
	inserter: string()
});
const RemoveWalletInputSchema = object({ id: uuid() });
const UpsertCredentialAsInserterInputSchema = object({
	id: uuid(),
	user_id: uuid(),
	issuer_auth_public_key: string(),
	encryptor_public_key: string(),
	content: string(),
	public_notes: string(),
	public_notes_signature: string(),
	broader_signature: string()
});
const AddCredentialInputSchema = object({
	id: uuid(),
	issuer_auth_public_key: string(),
	encryptor_public_key: string(),
	content: string(),
	public_notes: string(),
	public_notes_signature: string(),
	broader_signature: string()
});
const GetCredentialsOutputSchema = object({
	id: uuid(),
	user_id: uuid(),
	public_notes: string(),
	issuer_auth_public_key: string(),
	inserter: string().nullable(),
	original_id: uuid().nullable()
});
const GetCredentialsSharedByUserInputSchema = object({
	user_id: uuid(),
	issuer_auth_public_key: string().nullable()
});
const GetCredentialsSharedByUserOutputSchema = object({
	id: uuid(),
	user_id: uuid(),
	public_notes: string(),
	encryptor_public_key: string(),
	issuer_auth_public_key: string(),
	inserter: string().nullable(),
	original_id: uuid().nullable()
});
async function getCredentialsSharedByUser(kwilClient, params) {
	const inputs = GetCredentialsSharedByUserInputSchema.parse(params);
	return await kwilClient.call({
		name: "get_credentials_shared_by_user",
		inputs
	});
}
const EditCredentialInputSchema = object({
	id: uuid(),
	public_notes: string(),
	public_notes_signature: string(),
	broader_signature: string(),
	content: string(),
	encryptor_public_key: string(),
	issuer_auth_public_key: string()
});
const EditPublicNotesAsIssuerInputSchema = object({
	public_notes_id: string(),
	public_notes: string()
});
const RemoveCredentialInputSchema = object({ id: uuid() });
const RescindSharedCredentialInputSchema = object({ credential_id: uuid() });
async function rescindSharedCredential(kwilClient, params) {
	const inputs = RescindSharedCredentialInputSchema.parse(params);
	await kwilClient.execute({
		name: "rescind_shared_credential",
		inputs,
		description: "Rescind a shared credential as a grantee"
	});
}
const ShareCredentialInputSchema = object({
	id: uuid(),
	original_credential_id: uuid(),
	public_notes: string(),
	public_notes_signature: string(),
	broader_signature: string(),
	content: string(),
	content_hash: string(),
	encryptor_public_key: string(),
	issuer_auth_public_key: string(),
	grantee_wallet_identifier: string(),
	locked_until: number()
});
const CreateCredentialCopyInputSchema = object({
	id: uuid(),
	original_credential_id: uuid(),
	public_notes: string(),
	public_notes_signature: string(),
	broader_signature: string(),
	content: string(),
	encryptor_public_key: string(),
	issuer_auth_public_key: string()
});
const ShareCredentialThroughDagInputSchema = object({
	id: uuid(),
	user_id: uuid(),
	issuer_auth_public_key: string(),
	encryptor_public_key: string(),
	content: string(),
	content_hash: string(),
	public_notes: string(),
	public_notes_signature: string(),
	broader_signature: string(),
	original_credential_id: uuid(),
	dag_owner_wallet_identifier: string(),
	dag_grantee_wallet_identifier: string(),
	dag_locked_until: number(),
	dag_signature: string()
});
const CreateCredentialsByDwgInputSchema = object({
	issuer_auth_public_key: string(),
	original_encryptor_public_key: string(),
	original_credential_id: uuid(),
	original_content: string(),
	original_public_notes: string(),
	original_public_notes_signature: string(),
	original_broader_signature: string(),
	copy_encryptor_public_key: string(),
	copy_credential_id: uuid(),
	copy_content: string(),
	copy_public_notes_signature: string(),
	copy_broader_signature: string(),
	content_hash: string(),
	dwg_owner: string(),
	dwg_grantee: string(),
	dwg_issuer_public_key: string(),
	dwg_id: uuid(),
	dwg_access_grant_timelock: string(),
	dwg_not_before: string(),
	dwg_not_after: string(),
	dwg_signature: string()
});
const CredentialExistAsInserterInputSchema = object({ id: uuid() });
const CredentialExistAsInserterOutputSchema = object({ credential_exist: boolean() });
const GetCredentialOwnedInputSchema = object({ id: uuid() });
const GetCredentialOwnedOutputSchema = object({
	id: uuid(),
	user_id: uuid(),
	public_notes: string(),
	content: string(),
	encryptor_public_key: string(),
	issuer_auth_public_key: string(),
	inserter: string().nullable()
});
const GetCredentialSharedInputSchema = object({ id: uuid() });
const GetCredentialSharedOutputSchema = object({
	id: uuid(),
	user_id: uuid(),
	public_notes: string(),
	content: string(),
	encryptor_public_key: string(),
	issuer_auth_public_key: string(),
	inserter: string().nullable()
});
/**  As a credential copy doesn't contain PUBLIC notes, we return respective original credential PUBLIC notes */
async function getCredentialShared(kwilClient, params) {
	const inputs = GetCredentialSharedInputSchema.parse(params);
	return await kwilClient.call({
		name: "get_credential_shared",
		inputs
	});
}
const GetSiblingCredentialIdInputSchema = object({ content_hash: string() });
const GetSiblingCredentialIdOutputSchema = object({ id: uuid() });
const CredentialBelongsToCallerInputSchema = object({ id: uuid() });
const CredentialBelongsToCallerOutputSchema = object({ belongs: boolean() });
const CredentialExistInputSchema = object({ id: uuid() });
const CredentialExistOutputSchema = object({ credential_exist: boolean() });
const AddAttributeAsInserterInputSchema = object({
	id: uuid(),
	user_id: uuid(),
	attribute_key: string(),
	value: string()
});
const AddAttributeInputSchema = object({
	id: uuid(),
	attribute_key: string(),
	value: string()
});
const GetAttributesOutputSchema = object({
	id: uuid(),
	user_id: uuid(),
	attribute_key: string(),
	value: string(),
	original_id: uuid()
});
const EditAttributeInputSchema = object({
	id: uuid(),
	attribute_key: string(),
	value: string()
});
const RemoveAttributeInputSchema = object({ id: uuid() });
const ShareAttributeInputSchema = object({
	id: uuid(),
	original_attribute_id: uuid(),
	attribute_key: string(),
	value: string()
});
const DwgMessageInputSchema = object({
	owner_wallet_identifier: string(),
	grantee_wallet_identifier: string(),
	issuer_public_key: string(),
	id: uuid(),
	access_grant_timelock: string(),
	not_usable_before: string(),
	not_usable_after: string()
});
const DwgMessageOutputSchema = object({ message: string() });
const RevokeAccessGrantInputSchema = object({ id: uuid() });
const GetAccessGrantsOwnedOutputSchema = object({
	id: uuid(),
	ag_owner_user_id: uuid(),
	ag_grantee_wallet_identifier: string(),
	data_id: uuid(),
	locked_until: number(),
	content_hash: string().nullable(),
	inserter_type: string(),
	inserter_id: string()
});
const GetAccessGrantsGrantedInputSchema = object({
	user_id: uuid().nullable(),
	page: number(),
	size: number()
});
const GetAccessGrantsGrantedOutputSchema = object({
	id: uuid(),
	ag_owner_user_id: uuid(),
	ag_grantee_wallet_identifier: string(),
	data_id: uuid(),
	locked_until: number(),
	content_hash: string().nullable(),
	inserter_type: string(),
	inserter_id: string()
});
/**

*  As arguments can be undefined (user can not send them at all), we have to have default values: page=1, size=20

*  Page number starts from 1, as UI usually shows to user in pagination element

*  Ordering is consistent because we use height as first ordering parameter

*/
async function getAccessGrantsGranted(kwilClient, params) {
	const inputs = GetAccessGrantsGrantedInputSchema.parse(params);
	return await kwilClient.call({
		name: "get_access_grants_granted",
		inputs
	});
}
const GetAccessGrantsGrantedCountInputSchema = object({ user_id: uuid().nullable() });
const GetAccessGrantsGrantedCountOutputSchema = object({ count: number() });
async function getAccessGrantsGrantedCount(kwilClient, params) {
	const inputs = GetAccessGrantsGrantedCountInputSchema.parse(params);
	return await kwilClient.call({
		name: "get_access_grants_granted_count",
		inputs
	}).then((result) => result[0]);
}
const HasLockedAccessGrantsInputSchema = object({ id: uuid() });
const HasLockedAccessGrantsOutputSchema = object({ has: boolean() });
const DagMessageInputSchema = object({
	dag_owner_wallet_identifier: string(),
	dag_grantee_wallet_identifier: string(),
	dag_data_id: uuid(),
	dag_locked_until: number(),
	dag_content_hash: string()
});
const DagMessageOutputSchema = object({ message: string() });
const CreateAgByDagForCopyInputSchema = object({
	dag_owner_wallet_identifier: string(),
	dag_grantee_wallet_identifier: string(),
	dag_data_id: uuid(),
	dag_locked_until: number(),
	dag_content_hash: string(),
	dag_signature: string()
});
/**

*  Get the wallet type and public key for XRPL/NEAR wallets from database

*  This works for EVM-compatible signatures only

*/
async function createAgByDagForCopy(kwilClient, params) {
	const inputs = CreateAgByDagForCopyInputSchema.parse(params);
	await kwilClient.execute({
		name: "create_ag_by_dag_for_copy",
		inputs,
		description: "Create an Access Grant in idOS"
	});
}
const CreateAccessGrantInputSchema = object({
	grantee_wallet_identifier: string(),
	data_id: uuid(),
	locked_until: number(),
	content_hash: string(),
	inserter_type: string(),
	inserter_id: string()
});
const GetAccessGrantsForCredentialInputSchema = object({ credential_id: uuid() });
const GetAccessGrantsForCredentialOutputSchema = object({
	id: uuid(),
	ag_owner_user_id: uuid(),
	ag_grantee_wallet_identifier: string(),
	data_id: uuid(),
	locked_until: number(),
	content_hash: string().nullable(),
	inserter_type: string(),
	inserter_id: string()
});
async function getAccessGrantsForCredential(kwilClient, params) {
	const inputs = GetAccessGrantsForCredentialInputSchema.parse(params);
	return await kwilClient.call({
		name: "get_access_grants_for_credential",
		inputs
	});
}
const HasProfileInputSchema = object({ address: string() });
const HasProfileOutputSchema = object({ has_profile: boolean() });
const AddPassportingClubAsOwnerInputSchema = object({
	id: uuid(),
	name: string()
});
const DeletePassportingClubAsOwnerInputSchema = object({ id: uuid() });
const AddPassportingPeerAsOwnerInputSchema = object({
	id: uuid(),
	name: string(),
	issuer_public_key: string(),
	passporting_server_url_base: string()
});
const DeletePassportingPeerAsOwnerInputSchema = object({ id: uuid() });
const UpdatePassportingPeerAsOwnerInputSchema = object({
	id: uuid(),
	name: string(),
	issuer_public_key: string(),
	passporting_server_url_base: string()
});
const AddPeerToClubAsOwnerInputSchema = object({
	passporting_club_id: uuid(),
	passporting_peer_id: uuid()
});
const DeletePeerFromClubAsOwnerInputSchema = object({
	passporting_club_id: uuid(),
	passporting_peer_id: uuid()
});
const GetPassportingPeersOutputSchema = object({
	id: uuid(),
	name: string(),
	issuer_public_key: string(),
	passporting_server_url_base: string(),
	club_id: uuid(),
	club_name: string()
});
/**  get clubs the peer belongs to */
async function getPassportingPeers(kwilClient) {
	return await kwilClient.call({
		name: "get_passporting_peers",
		inputs: {}
	});
}

//#endregion
//#region ../@core/src/kwil-actions/index.ts
const GET_GRANTS_DEFAULT_RECORDS_PER_PAGE = 10;
async function getGrants(kwilClient, params = {
	page: 1,
	size: GET_GRANTS_DEFAULT_RECORDS_PER_PAGE,
	user_id: null
}) {
	return getAccessGrantsGranted(kwilClient, {
		page: params.page ?? 1,
		size: params.size ?? 10,
		user_id: params.user_id ?? null
	});
}

//#endregion
//#region ../../node_modules/.pnpm/tiny-invariant@1.3.3/node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var isProduction = process.env.NODE_ENV === "production";
var prefix = "Invariant failed";
function invariant(condition, message) {
	if (condition) return;
	if (isProduction) throw new Error(prefix);
	var provided = typeof message === "function" ? message() : message;
	var value = provided ? "".concat(prefix, ": ").concat(provided) : prefix;
	throw new Error(value);
}

//#endregion
//#region ../@core/src/kwil-infra/create-kwil-client.ts
/**

* A client for interacting with kwil with type-safe abstractions for `call` and `execute`.

* Has utility methods for creating actions and setting a signer.

*/
var KwilActionClient = class {
	signer;
	client;
	constructor(client) {
		this.client = client;
	}
	#createActionInputs(actionName, params = {}) {
		if (!params || !Object.keys(params).length) return [];
		const args = actionSchema[actionName];
		return args.map(({ name }) => {
			const value = params[name];
			if (value === "" || value === 0) return value;
			return value ?? null;
		});
	}
	#actionTypes(actionName) {
		const args = actionSchema[actionName];
		return args.map((arg) => arg.type);
	}
	/**
	
	* Calls an action on the kwil nodes. This similar to `GET` like request.
	
	*/
	async call(params, signer = this.signer) {
		const action = {
			name: params.name,
			namespace: "main",
			inputs: this.#createActionInputs(params.name, params.inputs),
			types: this.#actionTypes(params.name)
		};
		const response = await this.client.call(action, signer);
		return response?.data?.result;
	}
	/**
	
	* Executes an action on the kwil nodes. This similar to `POST` like request.
	
	*/
	async execute(params, signer = this.signer, synchronous = true) {
		invariant(signer, "Signer is not set, you must set it before executing an action");
		const action = {
			name: params.name,
			namespace: "main",
			description: params.description,
			inputs: [this.#createActionInputs(params.name, params.inputs)],
			types: this.#actionTypes(params.name)
		};
		const response = await this.client.execute(action, signer, synchronous);
		return response.data?.tx_hash;
	}
	setSigner(signer) {
		this.signer = signer;
	}
};
const DEFAULT_TIMEOUT = 3e4;
const createKwilClient = (Cls) => async ({ nodeUrl: kwilProvider, chainId }) => {
	const _kwil = new Cls({
		kwilProvider,
		chainId: ""
	});
	chainId ||= (await _kwil.chainInfo({ disableWarning: true })).data?.chain_id;
	invariant(chainId, "Can't discover `chainId`. You must pass it explicitly.");
	const client = new KwilActionClient(new Cls({
		kwilProvider,
		chainId,
		timeout: DEFAULT_TIMEOUT
	}));
	return client;
};
/**

* Create a kwil client for node.js environment

*/
const createNodeKwilClient = createKwilClient(NodeKwil);
/**

* Create a kwil client for browser environment

*/
const createWebKwilClient = createKwilClient(WebKwil);

//#endregion
//#region ../@core/src/kwil-infra/near/create-near-wallet-kwil-signer.ts
function implicitAddressFromPublicKey(publicKey) {
	const key_without_prefix = publicKey.replace(/^ed25519:/, "");
	return hexEncode(bs58Decode(key_without_prefix));
}

//#endregion
//#region ../@core/src/kwil-infra/nep413/index.ts
function kwilNep413Signer(recipient) {
	return (keyPair) => async (messageBytes) => {
		const message = utf8Decode(messageBytes);
		const nonceLength = 32;
		const nonce = crypto.getRandomValues(new Uint8Array(nonceLength));
		const nep413BorschSchema = { struct: {
			message: "string",
			nonce: { array: {
				type: "u8",
				len: nonceLength
			} },
			recipient: "string",
			callbackUrl: { option: "string" }
		} };
		const tag = 2147484061;
		const { signature } = keyPair.sign(sha256Hash(bytesConcat(borshSerialize("u32", tag), borshSerialize(nep413BorschSchema, {
			message,
			nonce,
			recipient
		}))));
		const kwilNep413BorschSchema = { struct: {
			tag: "u32",
			...nep413BorschSchema.struct
		} };
		const kwilNep413BorshParams = {
			tag,
			message,
			nonce,
			recipient
		};
		const kwilNep413BorshPayload = borshSerialize(kwilNep413BorschSchema, kwilNep413BorshParams);
		return bytesConcat(binaryWriteUint16BE(kwilNep413BorshPayload.length), kwilNep413BorshPayload, signature);
	};
}

//#endregion
//#region ../@core/src/kwil-infra/create-kwil-signer.ts
/**

* Helper function to check if the given object is a `nacl.SignKeyPair`.

*/
function isNaclSignKeyPair(object$1) {
	return object$1 !== null && typeof object$1 === "object" && "publicKey" in object$1 && object$1.publicKey instanceof Uint8Array && object$1.publicKey.length === nacl.sign.publicKeyLength && "secretKey" in object$1 && object$1.secretKey instanceof Uint8Array && object$1.secretKey.length === nacl.sign.secretKeyLength;
}
/**

* Helper function to check if the given object is a NEAR KeyPair.

*/
function isNearKeyPair(object$1) {
	return object$1 !== null && typeof object$1 === "object" && "getPublicKey" in object$1 && "sign" in object$1 && typeof object$1.getPublicKey === "function" && typeof object$1.sign === "function";
}
/**

* Helper function to check if the given object is a Stellar Keypair.

*/
function isStellarKeyPair(object$1) {
	return object$1 !== null && typeof object$1 === "object" && "publicKey" in object$1 && "sign" in object$1 && "canSign" in object$1 && typeof object$1.publicKey === "function" && typeof object$1.sign === "function" && typeof object$1.canSign === "function";
}
/**

* Helper function to check if the given object is a XRP KeyPair (Server key pairs only).

*/
function isXrplKeyPair(object$1) {
	return !!object$1 && typeof object$1 === "object" && "privateKey" in object$1 && "publicKey" in object$1;
}
/**

* Creates a `KwilSigner` and its associated `SignerAddress`.

*

* This function is explicitly marked as being for backend use only because it doesn't reset

* the KGW cookie when logging out and re-logging in with a different wallet.

*/
function createServerKwilSigner(signer) {
	if (isNaclSignKeyPair(signer)) return [new KwilSigner(async (msg) => nacl.sign.detached(msg, signer.secretKey), signer.publicKey, "ed25519"), implicitAddressFromPublicKey(bs58Encode(signer.publicKey))];
	if (isNearKeyPair(signer)) {
		const publicKey = implicitAddressFromPublicKey(signer.getPublicKey().toString());
		return [new KwilSigner(kwilNep413Signer("idos-issuer")(signer), publicKey, "nep413"), publicKey];
	}
	if (isStellarKeyPair(signer)) {
		const publicKeyString = signer.publicKey();
		const rawPublicKey = signer.rawPublicKey();
		return [new KwilSigner(async (msg) => signer.sign(Buffer.from(msg)), rawPublicKey, "ed25519"), publicKeyString];
	}
	if (isXrplKeyPair(signer)) return [new KwilSigner(async (msg) => hexDecode(xrpKeypair.sign(hexEncode(msg), signer.privateKey)), signer.publicKey, "xrpl"), signer.publicKey];
	if ("address" in signer) return [new KwilSigner(signer, signer.address), signer.address];
	return ((_) => {
		throw new Error("Invalid `signer` type");
	})(signer);
}

//#endregion
//#region ../@credentials/src/utils/index.ts
function isIssuerKey(issuer) {
	return typeof issuer === "object" && issuer !== null && "type" in issuer && "id" in issuer && "controller" in issuer;
}
function isCustomIssuerType(issuer) {
	return typeof issuer === "object" && issuer !== null && "issuer" in issuer && "publicKeyMultibase" in issuer;
}
async function issuerToKey(issuer) {
	if (isIssuerKey(issuer)) return issuer;
	if (isCustomIssuerType(issuer)) return await Ed25519VerificationKey2020.from({
		id: `${issuer.issuer}/keys/1`,
		controller: `${issuer.issuer}/issuers/1`,
		publicKeyMultibase: issuer.publicKeyMultibase,
		privateKeyMultibase: issuer.privateKeyMultibase,
		type: "Ed25519VerificationKey2020"
	});
	return await Ed25519VerificationKey2020.from({
		...issuer,
		type: "Ed25519VerificationKey2020"
	});
}

//#endregion
//#region ../@credentials/assets/ed25519-signature-2020-v1.json
var __context$4 = {
	"id": "@id",
	"type": "@type",
	"@protected": true,
	"proof": {
		"@id": "https://w3id.org/security#proof",
		"@type": "@id",
		"@container": "@graph"
	},
	"Ed25519VerificationKey2020": {
		"@id": "https://w3id.org/security#Ed25519VerificationKey2020",
		"@context": {
			"@protected": true,
			"id": "@id",
			"type": "@type",
			"controller": {
				"@id": "https://w3id.org/security#controller",
				"@type": "@id"
			},
			"revoked": {
				"@id": "https://w3id.org/security#revoked",
				"@type": "http://www.w3.org/2001/XMLSchema#dateTime"
			},
			"publicKeyMultibase": {
				"@id": "https://w3id.org/security#publicKeyMultibase",
				"@type": "https://w3id.org/security#multibase"
			}
		}
	},
	"Ed25519Signature2020": {
		"@id": "https://w3id.org/security#Ed25519Signature2020",
		"@context": {
			"@protected": true,
			"id": "@id",
			"type": "@type",
			"challenge": "https://w3id.org/security#challenge",
			"created": {
				"@id": "http://purl.org/dc/terms/created",
				"@type": "http://www.w3.org/2001/XMLSchema#dateTime"
			},
			"domain": "https://w3id.org/security#domain",
			"expires": {
				"@id": "https://w3id.org/security#expiration",
				"@type": "http://www.w3.org/2001/XMLSchema#dateTime"
			},
			"nonce": "https://w3id.org/security#nonce",
			"proofPurpose": {
				"@id": "https://w3id.org/security#proofPurpose",
				"@type": "@vocab",
				"@context": {
					"@protected": true,
					"id": "@id",
					"type": "@type",
					"assertionMethod": {
						"@id": "https://w3id.org/security#assertionMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"authentication": {
						"@id": "https://w3id.org/security#authenticationMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"capabilityInvocation": {
						"@id": "https://w3id.org/security#capabilityInvocationMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"capabilityDelegation": {
						"@id": "https://w3id.org/security#capabilityDelegationMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"keyAgreement": {
						"@id": "https://w3id.org/security#keyAgreementMethod",
						"@type": "@id",
						"@container": "@set"
					}
				}
			},
			"proofValue": {
				"@id": "https://w3id.org/security#proofValue",
				"@type": "https://w3id.org/security#multibase"
			},
			"verificationMethod": {
				"@id": "https://w3id.org/security#verificationMethod",
				"@type": "@id"
			}
		}
	}
};
var ed25519_signature_2020_v1_default = { "@context": __context$4 };

//#endregion
//#region ../@credentials/assets/idos-credential-subject-face-id-v1.json
var __context$3 = {
	"@version": 1.1,
	"@protected": true,
	"xsd": "http://www.w3.org/2001/XMLSchema#",
	"faceSignUserId": "xsd:string"
};
var idos_credential_subject_face_id_v1_default = { "@context": __context$3 };

//#endregion
//#region ../@credentials/assets/idos-credential-subject-v1.json
var __context$2 = {
	"@version": 1.1,
	"@protected": true,
	"xsd": "http://www.w3.org/2001/XMLSchema#",
	"aux": "https://raw.githubusercontent.com/idos-network/idos-sdk-js/168f449a799620123bc7b01fc224423739500f94/packages/issuer-sdk-js/assets/country-codes.xml",
	"applicantId": "xsd:string",
	"inquiryId": "xsd:string",
	"firstName": "xsd:string",
	"middleName": "xsd:string",
	"nationality": "aux:ISO_3166-1_alpha-2",
	"familyName": "xsd:string",
	"maidenName": "xsd:string",
	"gender": "xsd:string",
	"governmentId": "xsd:string",
	"governmentIdType": "xsd:string",
	"email": "xsd:string",
	"ssn": "xsd:string",
	"phoneNumber": "xsd:string",
	"dateOfBirth": "aux:date",
	"placeOfBirth": "xsd:string",
	"idDocumentCountry": "xsd:string",
	"idDocumentNumber": "xsd:string",
	"idDocumentType": "xsd:string",
	"idDocumentDateOfIssue": "aux:date",
	"idDocumentDateOfExpiry": "aux:date",
	"idDocumentFrontFile": "xsd:string",
	"idDocumentBackFile": "xsd:string",
	"selfieFile": "xsd:string",
	"residentialAddressStreet": "xsd:string",
	"residentialAddressHouseNumber": "xsd:string",
	"residentialAddressAdditionalAddressInfo": "xsd:string",
	"residentialAddressRegion": "xsd:string",
	"residentialAddressCity": "xsd:string",
	"residentialAddressPostalCode": "xsd:string",
	"residentialAddressCountry": "aux:ISO_3166-1_alpha-2",
	"residentialAddressProofCategory": "xsd:string",
	"residentialAddressProofDateOfIssue": "xsd:date",
	"residentialAddressProofFile": "xsd:string"
};
var idos_credential_subject_v1_default = { "@context": __context$2 };

//#endregion
//#region ../@credentials/assets/idos-credentials-v1.json
var __context$1 = {
	"@version": 1.1,
	"@protected": true,
	"xsd": "http://www.w3.org/2001/XMLSchema#",
	"approvedAt": "xsd:date",
	"level": "xsd:string"
};
var idos_credentials_v1_default = { "@context": __context$1 };

//#endregion
//#region ../@credentials/assets/v1.json
var __context = {
	"@version": 1.1,
	"@protected": true,
	"id": "@id",
	"type": "@type",
	"VerifiableCredential": {
		"@id": "https://www.w3.org/2018/credentials#VerifiableCredential",
		"@context": {
			"@version": 1.1,
			"@protected": true,
			"id": "@id",
			"type": "@type",
			"cred": "https://www.w3.org/2018/credentials#",
			"sec": "https://w3id.org/security#",
			"xsd": "http://www.w3.org/2001/XMLSchema#",
			"credentialSchema": {
				"@id": "cred:credentialSchema",
				"@type": "@id",
				"@context": {
					"@version": 1.1,
					"@protected": true,
					"id": "@id",
					"type": "@type",
					"cred": "https://www.w3.org/2018/credentials#",
					"JsonSchemaValidator2018": "cred:JsonSchemaValidator2018"
				}
			},
			"credentialStatus": {
				"@id": "cred:credentialStatus",
				"@type": "@id"
			},
			"credentialSubject": {
				"@id": "cred:credentialSubject",
				"@type": "@id"
			},
			"evidence": {
				"@id": "cred:evidence",
				"@type": "@id"
			},
			"expirationDate": {
				"@id": "cred:expirationDate",
				"@type": "xsd:dateTime"
			},
			"holder": {
				"@id": "cred:holder",
				"@type": "@id"
			},
			"issued": {
				"@id": "cred:issued",
				"@type": "xsd:dateTime"
			},
			"issuer": {
				"@id": "cred:issuer",
				"@type": "@id"
			},
			"issuanceDate": {
				"@id": "cred:issuanceDate",
				"@type": "xsd:dateTime"
			},
			"proof": {
				"@id": "sec:proof",
				"@type": "@id",
				"@container": "@graph"
			},
			"refreshService": {
				"@id": "cred:refreshService",
				"@type": "@id",
				"@context": {
					"@version": 1.1,
					"@protected": true,
					"id": "@id",
					"type": "@type",
					"cred": "https://www.w3.org/2018/credentials#",
					"ManualRefreshService2018": "cred:ManualRefreshService2018"
				}
			},
			"termsOfUse": {
				"@id": "cred:termsOfUse",
				"@type": "@id"
			},
			"validFrom": {
				"@id": "cred:validFrom",
				"@type": "xsd:dateTime"
			},
			"validUntil": {
				"@id": "cred:validUntil",
				"@type": "xsd:dateTime"
			}
		}
	},
	"VerifiablePresentation": {
		"@id": "https://www.w3.org/2018/credentials#VerifiablePresentation",
		"@context": {
			"@version": 1.1,
			"@protected": true,
			"id": "@id",
			"type": "@type",
			"cred": "https://www.w3.org/2018/credentials#",
			"sec": "https://w3id.org/security#",
			"holder": {
				"@id": "cred:holder",
				"@type": "@id"
			},
			"proof": {
				"@id": "sec:proof",
				"@type": "@id",
				"@container": "@graph"
			},
			"verifiableCredential": {
				"@id": "cred:verifiableCredential",
				"@type": "@id",
				"@container": "@graph"
			}
		}
	},
	"EcdsaSecp256k1Signature2019": {
		"@id": "https://w3id.org/security#EcdsaSecp256k1Signature2019",
		"@context": {
			"@version": 1.1,
			"@protected": true,
			"id": "@id",
			"type": "@type",
			"sec": "https://w3id.org/security#",
			"xsd": "http://www.w3.org/2001/XMLSchema#",
			"challenge": "sec:challenge",
			"created": {
				"@id": "http://purl.org/dc/terms/created",
				"@type": "xsd:dateTime"
			},
			"domain": "sec:domain",
			"expires": {
				"@id": "sec:expiration",
				"@type": "xsd:dateTime"
			},
			"jws": "sec:jws",
			"nonce": "sec:nonce",
			"proofPurpose": {
				"@id": "sec:proofPurpose",
				"@type": "@vocab",
				"@context": {
					"@version": 1.1,
					"@protected": true,
					"id": "@id",
					"type": "@type",
					"sec": "https://w3id.org/security#",
					"assertionMethod": {
						"@id": "sec:assertionMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"authentication": {
						"@id": "sec:authenticationMethod",
						"@type": "@id",
						"@container": "@set"
					}
				}
			},
			"proofValue": "sec:proofValue",
			"verificationMethod": {
				"@id": "sec:verificationMethod",
				"@type": "@id"
			}
		}
	},
	"EcdsaSecp256r1Signature2019": {
		"@id": "https://w3id.org/security#EcdsaSecp256r1Signature2019",
		"@context": {
			"@version": 1.1,
			"@protected": true,
			"id": "@id",
			"type": "@type",
			"sec": "https://w3id.org/security#",
			"xsd": "http://www.w3.org/2001/XMLSchema#",
			"challenge": "sec:challenge",
			"created": {
				"@id": "http://purl.org/dc/terms/created",
				"@type": "xsd:dateTime"
			},
			"domain": "sec:domain",
			"expires": {
				"@id": "sec:expiration",
				"@type": "xsd:dateTime"
			},
			"jws": "sec:jws",
			"nonce": "sec:nonce",
			"proofPurpose": {
				"@id": "sec:proofPurpose",
				"@type": "@vocab",
				"@context": {
					"@version": 1.1,
					"@protected": true,
					"id": "@id",
					"type": "@type",
					"sec": "https://w3id.org/security#",
					"assertionMethod": {
						"@id": "sec:assertionMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"authentication": {
						"@id": "sec:authenticationMethod",
						"@type": "@id",
						"@container": "@set"
					}
				}
			},
			"proofValue": "sec:proofValue",
			"verificationMethod": {
				"@id": "sec:verificationMethod",
				"@type": "@id"
			}
		}
	},
	"Ed25519Signature2018": {
		"@id": "https://w3id.org/security#Ed25519Signature2018",
		"@context": {
			"@version": 1.1,
			"@protected": true,
			"id": "@id",
			"type": "@type",
			"sec": "https://w3id.org/security#",
			"xsd": "http://www.w3.org/2001/XMLSchema#",
			"challenge": "sec:challenge",
			"created": {
				"@id": "http://purl.org/dc/terms/created",
				"@type": "xsd:dateTime"
			},
			"domain": "sec:domain",
			"expires": {
				"@id": "sec:expiration",
				"@type": "xsd:dateTime"
			},
			"jws": "sec:jws",
			"nonce": "sec:nonce",
			"proofPurpose": {
				"@id": "sec:proofPurpose",
				"@type": "@vocab",
				"@context": {
					"@version": 1.1,
					"@protected": true,
					"id": "@id",
					"type": "@type",
					"sec": "https://w3id.org/security#",
					"assertionMethod": {
						"@id": "sec:assertionMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"authentication": {
						"@id": "sec:authenticationMethod",
						"@type": "@id",
						"@container": "@set"
					}
				}
			},
			"proofValue": "sec:proofValue",
			"verificationMethod": {
				"@id": "sec:verificationMethod",
				"@type": "@id"
			}
		}
	},
	"RsaSignature2018": {
		"@id": "https://w3id.org/security#RsaSignature2018",
		"@context": {
			"@version": 1.1,
			"@protected": true,
			"challenge": "sec:challenge",
			"created": {
				"@id": "http://purl.org/dc/terms/created",
				"@type": "xsd:dateTime"
			},
			"domain": "sec:domain",
			"expires": {
				"@id": "sec:expiration",
				"@type": "xsd:dateTime"
			},
			"jws": "sec:jws",
			"nonce": "sec:nonce",
			"proofPurpose": {
				"@id": "sec:proofPurpose",
				"@type": "@vocab",
				"@context": {
					"@version": 1.1,
					"@protected": true,
					"id": "@id",
					"type": "@type",
					"sec": "https://w3id.org/security#",
					"assertionMethod": {
						"@id": "sec:assertionMethod",
						"@type": "@id",
						"@container": "@set"
					},
					"authentication": {
						"@id": "sec:authenticationMethod",
						"@type": "@id",
						"@container": "@set"
					}
				}
			},
			"proofValue": "sec:proofValue",
			"verificationMethod": {
				"@id": "sec:verificationMethod",
				"@type": "@id"
			}
		}
	},
	"proof": {
		"@id": "https://w3id.org/security#proof",
		"@type": "@id",
		"@container": "@graph"
	}
};
var v1_default = { "@context": __context };

//#endregion
//#region ../@credentials/src/utils/loader.ts
const CONTEXT_V1 = "https://www.w3.org/2018/credentials/v1";
const CONTEXT_ED25519_SIGNATURE_2020_V1 = "https://w3id.org/security/suites/ed25519-2020/v1";
const CONTEXT_IDOS_CREDENTIAL_V1 = "https://idos-network.github.io/idos-sdk-js/credentials/idos-credentials-v1.json";
const CONTEXT_IDOS_CREDENTIAL_V1_SUBJECT = "https://idos-network.github.io/idos-sdk-js/credentials/idos-credential-subject-v1.json";
const CONTEXT_IDOS_CREDENTIAL_V1_FACE_ID = "https://idos-network.github.io/idos-sdk-js/credentials/idos-credential-subject-face-id-v1.json";
function buildDocumentLoader() {
	const loader = new JsonLdDocumentLoader();
	loader.addStatic(CONTEXT_V1, v1_default);
	loader.addStatic(CONTEXT_IDOS_CREDENTIAL_V1, idos_credentials_v1_default);
	loader.addStatic(CONTEXT_IDOS_CREDENTIAL_V1_SUBJECT, idos_credential_subject_v1_default);
	loader.addStatic(CONTEXT_ED25519_SIGNATURE_2020_V1, ed25519_signature_2020_v1_default);
	loader.addStatic(CONTEXT_IDOS_CREDENTIAL_V1_FACE_ID, idos_credential_subject_face_id_v1_default);
	[
		"1356fea6672d22deb07fedc5fa427478b2e1654c",
		"346f14468348e4f3dd00039c89ce9bb49d88777c",
		"1e8421744e037dfd7b0289cb39261c73ab6d643c",
		"0049d2e93f8913c42398372e2bb65d92bed38ac0"
	].forEach((hash) => {
		loader.addStatic(`https://raw.githubusercontent.com/idos-network/idos-sdk-js/${hash}/packages/%40credentials/assets/idos-credentials-v1.json`, idos_credentials_v1_default);
		loader.addStatic(`https://raw.githubusercontent.com/idos-network/idos-sdk-js/${hash}/packages/%40credentials/assets/idos-credential-subject-v1.json`, idos_credential_subject_v1_default);
	});
	["1bc3503f5302a7e42777076445d5b05fec8db429"].forEach((hash) => {
		loader.addStatic(`https://raw.githubusercontent.com/idos-network/idos-sdk-js/${hash}/packages/issuer-sdk-js/assets/idos-credentials-v1.json`, idos_credentials_v1_default);
		loader.addStatic(`https://raw.githubusercontent.com/idos-network/idos-sdk-js/${hash}/packages/issuer-sdk-js/assets/idos-credential-subject-v1.json`, idos_credential_subject_v1_default);
	});
	return loader.build();
}
const defaultDocumentLoader = buildDocumentLoader();

//#endregion
//#region ../@credentials/src/verifier.ts
async function verifyCredential(credential, issuers, customDocumentLoader) {
	const resultsByIssuer = /* @__PURE__ */ new Map();
	for (const issuer of issuers) {
		const publicKey = await issuerToKey(issuer);
		const vcVerifyingSuite = new Ed25519Signature2020({
			key: publicKey,
			verificationMethod: publicKey.id
		});
		const controller = {
			"@context": "https://w3id.org/security/v2",
			id: publicKey.controller,
			assertionMethod: [publicKey.id],
			authentication: [publicKey.id]
		};
		const verifyCredentialResult = await vc.verifyCredential({
			credential,
			suite: vcVerifyingSuite,
			controller,
			documentLoader: customDocumentLoader ?? defaultDocumentLoader
		});
		resultsByIssuer.set(issuer, verifyCredentialResult);
		if (verifyCredentialResult.verified) return [true, resultsByIssuer];
	}
	return [false, resultsByIssuer];
}

//#endregion
//#region src/index.ts
var idOSConsumer = class idOSConsumer {
	address;
	#kwilClient;
	#noncedBox;
	#signer;
	static async init({ recipientEncryptionPrivateKey, nodeUrl = "https://nodes.idos.network", chainId, consumerSigner }) {
		const kwilClient = await createNodeKwilClient({
			nodeUrl,
			chainId
		});
		const [signer, address] = createServerKwilSigner(consumerSigner);
		kwilClient.setSigner(signer);
		return new idOSConsumer(NoncedBox.nonceFromBase64SecretKey(recipientEncryptionPrivateKey), kwilClient, address, signer);
	}
	constructor(noncedBox, kwilClient, address, signer) {
		this.#noncedBox = noncedBox;
		this.#kwilClient = kwilClient;
		this.address = address;
		this.#signer = signer;
	}
	get signer() {
		return this.#signer;
	}
	get encryptionPublicKey() {
		return base64Encode(this.#noncedBox.keyPair.publicKey);
	}
	async getCredentialSharedFromIDOS(dataId) {
		return getCredentialShared(this.#kwilClient, { id: dataId }).then((res) => res[0]);
	}
	async getCredentialSharedContentDecrypted(dataId) {
		const credentialCopy = await this.getCredentialSharedFromIDOS(dataId);
		invariant(credentialCopy, `Credential with id ${dataId} not found`);
		return await this.#noncedBox.decrypt(credentialCopy.content, credentialCopy.encryptor_public_key);
	}
	async rescindSharedCredential(credentialId) {
		return rescindSharedCredential(this.#kwilClient, { credential_id: credentialId });
	}
	async getGrantsCount(userId = null) {
		return getAccessGrantsGrantedCount(this.#kwilClient, { user_id: userId ?? null }).then((res) => res.count);
	}
	async getAccessGrantsForCredential(credentialId) {
		const params = { credential_id: credentialId };
		const accessGrants = await getAccessGrantsForCredential(this.#kwilClient, params);
		return accessGrants[0];
	}
	async getCredentialsSharedByUser(userId) {
		return getCredentialsSharedByUser(this.#kwilClient, {
			user_id: userId,
			issuer_auth_public_key: null
		});
	}
	async getReusableCredentialCompliantly(credentialId) {
		const credential = await this.getCredentialSharedFromIDOS(credentialId);
		invariant(credential, `Credential with id ${credentialId} not found`);
		const accessGrant = await this.getAccessGrantsForCredential(credentialId);
		invariant(accessGrant, `Access grant with id ${credentialId} not found`);
		const credentialContent = await this.#noncedBox.decrypt(credential.content, credential.encryptor_public_key);
		const contentHash = hexEncodeSha256Hash(utf8Encode(credentialContent));
		if (contentHash !== accessGrant.content_hash) throw new Error("Credential content hash does not match the access grant hash");
		return credential;
	}
	async getAccessGrants(params) {
		return {
			grants: await getGrants(this.#kwilClient, params),
			totalCount: await this.getGrantsCount(params.user_id)
		};
	}
	async createAccessGrantByDag(params) {
		await createAgByDagForCopy(this.#kwilClient, params);
		return params;
	}
	async getPassportingPeers() {
		return getPassportingPeers(this.#kwilClient);
	}
	async verifyCredential(credentials, issuers) {
		return verifyCredential(credentials, issuers);
	}
};

//#endregion
export { idOSConsumer };
//# sourceMappingURL=index.js.map