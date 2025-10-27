//#region src/mpc/types.ts
const UPLOAD_TYPES = { UploadSignatureMessage: [{
	name: "share_commitments",
	type: "bytes32[]"
}, {
	name: "recovering_addresses",
	type: "string[]"
}] };
const DOWNLOAD_TYPES = { DownloadSignatureMessage: [
	{
		name: "recovering_address",
		type: "string"
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
const UPDATE_TYPES = { UpdateWalletsSignatureMessage: [{
	name: "recovering_addresses",
	type: "string[]"
}, {
	name: "timestamp",
	type: "uint64"
}] };
const ADD_ADDRESS_TYPES = { AddAddressSignatureMessage: [
	{
		name: "recovering_address",
		type: "string"
	},
	{
		name: "address_to_add",
		type: "string"
	},
	{
		name: "timestamp",
		type: "uint64"
	}
] };
const REMOVE_ADDRESS_TYPES = { RemoveAddressSignatureMessage: [
	{
		name: "recovering_address",
		type: "string"
	},
	{
		name: "address_to_remove",
		type: "string"
	},
	{
		name: "timestamp",
		type: "uint64"
	}
] };

//#endregion
export { ADD_ADDRESS_TYPES, DOWNLOAD_TYPES, REMOVE_ADDRESS_TYPES, UPDATE_TYPES, UPLOAD_TYPES };
//# sourceMappingURL=types-KQOutY5w.js.map