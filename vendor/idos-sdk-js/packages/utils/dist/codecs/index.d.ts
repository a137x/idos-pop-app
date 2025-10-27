import { decode as hexDecode, encode as hexEncode } from "@stablelib/hex";
import { hash as sha256Hash } from "@stablelib/sha256";
import { decode as utf8Decode, encode as utf8Encode } from "@stablelib/utf8";
import { decode as base64Decode, encode as base64Encode } from "@stablelib/base64";
import { writeUint16BE as binaryWriteUint16BE } from "@stablelib/binary";
import { concat as bytesConcat } from "@stablelib/bytes";
import { deserialize as borshDeserialize, serialize as borshSerialize } from "borsh";

//#region src/codecs/index.d.ts
declare function hexEncodeSha256Hash(data: Uint8Array): string;
declare function bs58Encode(data: Uint8Array): string;
declare function bs58Decode(data: string): Uint8Array;
declare function toBytes(obj: Parameters<typeof JSON.stringify>[0]): Uint8Array;
// biome-ignore lint/suspicious/noExplicitAny: any is fine here
declare function fromBytesToJson<K = Record<string, any>>(data: Uint8Array): K;
//#endregion
export { base64Decode, base64Encode, binaryWriteUint16BE, borshDeserialize, borshSerialize, bs58Decode, bs58Encode, bytesConcat, fromBytesToJson, hexDecode, hexEncode, hexEncodeSha256Hash, sha256Hash, toBytes, utf8Decode, utf8Encode };
//# sourceMappingURL=index.d.ts.map