import nacl from "tweetnacl";

//#region src/encryption/index.d.ts
declare function keyDerivation(password: string, salt: string): Promise<Uint8Array<ArrayBufferLike>>;
declare function encrypt(message: Uint8Array, publicKey: Uint8Array, receiverPublicKey: Uint8Array): {
  content: Uint8Array<ArrayBuffer>;
  encryptorPublicKey: Uint8Array;
};
declare function decrypt(fullMessage: Uint8Array<ArrayBufferLike>, keyPair: nacl.BoxKeyPair, senderPublicKey: Uint8Array): Promise<Uint8Array<ArrayBufferLike>>;
//#endregion
export { decrypt, encrypt, keyDerivation };
//# sourceMappingURL=index.d.ts.map