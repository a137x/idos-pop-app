import { decode as hexDecode, encode as hexEncode } from "@stablelib/hex";
import { hash as sha256Hash } from "@stablelib/sha256";
import { decode, decode as utf8Decode, encode, encode as utf8Encode } from "@stablelib/utf8";
import bs58 from "bs58";
import { decode as base64Decode, encode as base64Encode } from "@stablelib/base64";
import { writeUint16BE as binaryWriteUint16BE } from "@stablelib/binary";
import { concat as bytesConcat } from "@stablelib/bytes";
import { deserialize as borshDeserialize, serialize as borshSerialize } from "borsh";

//#region src/codecs/index.ts
function hexEncodeSha256Hash(data) {
	return hexEncode(sha256Hash(data), true);
}
function bs58Encode(data) {
	return bs58.encode(data);
}
function bs58Decode(data) {
	return bs58.decode(data);
}
function toBytes(obj) {
	return encode(JSON.stringify(obj));
}
function fromBytesToJson(data) {
	return JSON.parse(decode(data));
}

//#endregion
export { base64Decode, base64Encode, binaryWriteUint16BE, borshDeserialize, borshSerialize, bs58Decode, bs58Encode, bytesConcat, fromBytesToJson, hexDecode, hexEncode, hexEncodeSha256Hash, sha256Hash, toBytes, utf8Decode, utf8Encode };
//# sourceMappingURL=codecs-Ddj-ztlR.js.map