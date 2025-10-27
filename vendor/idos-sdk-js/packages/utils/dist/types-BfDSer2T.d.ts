import { TypedDataDomain, TypedDataField } from "ethers";

//#region src/mpc/types.d.ts
type PbcAddress = string;
type Bytes32 = string;
type Bytes24 = string;
type Address = string;
type Bytes = string;
declare const UPLOAD_TYPES: Record<string, TypedDataField[]>;
declare const DOWNLOAD_TYPES: Record<string, TypedDataField[]>;
declare const UPDATE_TYPES: Record<string, TypedDataField[]>;
declare const ADD_ADDRESS_TYPES: Record<string, TypedDataField[]>;
declare const REMOVE_ADDRESS_TYPES: Record<string, TypedDataField[]>;
interface UploadSignatureMessage {
  share_commitments: Bytes32[];
  recovering_addresses: Address[];
}
interface Sharing {
  share_commitments: Bytes32[];
  recovering_addresses: Address[];
  share_data: Bytes;
}
interface DownloadSignatureMessage {
  recovering_address: Address;
  timestamp: number;
  public_key: Bytes32;
}
type DownloadRequest = DownloadSignatureMessage;
interface AddAddressSignatureMessage {
  recovering_address: Address;
  address_to_add: Address;
  timestamp: number;
}
type AddAddressRequest = AddAddressSignatureMessage;
interface RemoveAddressSignatureMessage {
  recovering_address: Address;
  address_to_remove: Address;
  timestamp: number;
}
type RemoveAddressRequest = RemoveAddressSignatureMessage;
interface UpdateWalletsSignatureMessage {
  recovering_addresses: Address[];
  timestamp: number;
}
type UpdateWalletsRequest = UpdateWalletsSignatureMessage;
interface EncryptedShare {
  encrypted_share: Bytes;
  public_key: Bytes32;
  nonce: Bytes24;
}
type DownloadMessageToSign = {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  value: DownloadSignatureMessage;
};
type UploadMessageToSign = {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  value: UploadSignatureMessage;
};
type AddAddressMessageToSign = {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  value: AddAddressSignatureMessage;
};
type RemoveAddressMessageToSign = {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  value: RemoveAddressSignatureMessage;
};
//#endregion
export { ADD_ADDRESS_TYPES, AddAddressMessageToSign, AddAddressRequest, AddAddressSignatureMessage, Address, Bytes, Bytes24, Bytes32, DOWNLOAD_TYPES, DownloadMessageToSign, DownloadRequest, DownloadSignatureMessage, EncryptedShare, PbcAddress, REMOVE_ADDRESS_TYPES, RemoveAddressMessageToSign, RemoveAddressRequest, RemoveAddressSignatureMessage, Sharing, UPDATE_TYPES, UPLOAD_TYPES, UpdateWalletsRequest, UpdateWalletsSignatureMessage, UploadMessageToSign, UploadSignatureMessage };
//# sourceMappingURL=types-BfDSer2T.d.ts.map