import nacl from "tweetnacl";
import { KwilSigner, Utils } from "@idos-network/kwil-js";
import { KeyPair } from "near-api-js";
import * as vc from "@digitalbazaar/vc";
import { Ed25519VerificationKey2020, Ed25519VerificationKey2020Options } from "@digitalbazaar/ed25519-verification-key-2020";
import "jsonld-document-loader";
import { Keypair } from "@stellar/stellar-sdk";
import { JsonRpcSigner, Wallet } from "ethers";
import { KeyPair as KeyPair$1 } from "ripple-keypairs/src/types";
import * as z$1 from "zod";
import * as z from "zod";

//#region ../@credentials/src/utils/types.d.ts
type idOSCredential = {
  id: string;
  user_id: string;
  public_notes: string;
  content: string;
  encryptor_public_key: string;
  issuer_auth_public_key: string;
  original_id?: string | null;
};
// https://github.com/colinhacks/zod/issues/3751
declare const CredentialResidentialAddressSchema: z$1.ZodObject<{
  street: z$1.ZodString;
  houseNumber: z$1.ZodOptional<z$1.ZodString>;
  additionalAddressInfo: z$1.ZodOptional<z$1.ZodString>;
  region: z$1.ZodOptional<z$1.ZodString>;
  city: z$1.ZodString;
  postalCode: z$1.ZodString;
  country: z$1.ZodString;
  proofCategory: z$1.ZodString;
  proofDateOfIssue: z$1.ZodOptional<z$1.ZodDate>;
  proofFile: z$1.ZodType<Buffer<ArrayBufferLike>>;
}>;
declare const IDDocumentTypeSchema: z$1.ZodEnum<{
  PASSPORT: "PASSPORT";
  DRIVERS: "DRIVERS";
  ID_CARD: "ID_CARD";
}>;
type IDDocumentType = z$1.infer<typeof IDDocumentTypeSchema>;
declare const GenderSchema: z$1.ZodEnum<{
  M: "M";
  F: "F";
  OTHER: "OTHER";
}>;
// https://github.com/colinhacks/zod/issues/3751
declare const CredentialSubjectSchema: z$1.ZodObject<{
  id: z$1.ZodString;
  applicantId: z$1.ZodOptional<z$1.ZodString>;
  inquiryId: z$1.ZodOptional<z$1.ZodString>;
  firstName: z$1.ZodString;
  middleName: z$1.ZodOptional<z$1.ZodString>;
  ssn: z$1.ZodOptional<z$1.ZodString>;
  gender: z$1.ZodOptional<typeof GenderSchema>;
  nationality: z$1.ZodOptional<z$1.ZodString>;
  familyName: z$1.ZodString;
  maidenName: z$1.ZodOptional<z$1.ZodString>;
  governmentId: z$1.ZodOptional<z$1.ZodString>;
  governmentIdType: z$1.ZodOptional<z$1.ZodString>;
  dateOfBirth: z$1.ZodDate;
  placeOfBirth: z$1.ZodOptional<z$1.ZodString>;
  email: z$1.ZodOptional<z$1.ZodEmail>;
  phoneNumber: z$1.ZodOptional<z$1.ZodString>;
  idDocumentCountry: z$1.ZodString;
  idDocumentNumber: z$1.ZodString;
  idDocumentType: typeof IDDocumentTypeSchema;
  idDocumentDateOfIssue: z$1.ZodOptional<z$1.ZodDate>;
  idDocumentDateOfExpiry: z$1.ZodOptional<z$1.ZodDate>;
  idDocumentFrontFile: z$1.ZodType<Buffer<ArrayBufferLike>>;
  idDocumentBackFile: z$1.ZodOptional<z$1.ZodType<Buffer<ArrayBufferLike>>>;
  selfieFile: z$1.ZodType<Buffer<ArrayBufferLike>>;
  residentialAddress: z$1.ZodOptional<typeof CredentialResidentialAddressSchema>;
}>;
type CredentialSubject = z$1.infer<typeof CredentialSubjectSchema>;
interface VerifiableCredentialSubject extends Omit<CredentialSubject, "residentialAddress"> {
  "@context": string;
  residentialAddressStreet?: string;
  residentialAddressHouseNumber?: string;
  residentialAddressAdditionalAddressInfo?: string;
  residentialAddressRegion?: string;
  residentialAddressCity?: string;
  residentialAddressPostalCode?: string;
  residentialAddressCountry?: string;
  residentialAddressProofCategory?: string;
  residentialAddressProofDateOfIssue?: string;
  residentialAddressProofFile?: Buffer<ArrayBufferLike>;
}
// TODO: This is a stub of the types for @digitalbazaar/vc
// when they introduce TypeScript support we should remove this
// The copy is here because `types.d.ts` file is not bundled.
interface VerifiedCredentialsProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofValue: string;
  proofPurpose: string;
}
interface VerifiedCredentials<K> {
  "@context": string[];
  type: string[];
  issuer: string;
  id: string;
  level: string;
  issued: string;
  approvedAt: string;
  expirationDate: string;
  credentialSubject: K;
  issuanceDate: string;
  proof: VerifiedCredentialsProof;
}
type VerifiableCredential<K> = VerifiedCredentials<K>;
//#endregion
//#region ../@credentials/src/utils/index.d.ts
interface CustomIssuerType {
  issuer: string;
  /* Multibase encoded public key */
  publicKeyMultibase: string;
  /* Multibase encoded private key */
  privateKeyMultibase?: string;
}
type AvailableIssuerType = Omit<Ed25519VerificationKey2020Options, "type"> | Ed25519VerificationKey2020 | CustomIssuerType;
//#endregion
//#region ../@credentials/src/builder.d.ts
type Credential = VerifiableCredential<VerifiableCredentialSubject>;
//#endregion
//#region ../@credentials/src/verifier.d.ts
type VerifyCredentialResult = [boolean, Map<AvailableIssuerType, vc.VerifyCredentialResult>];
//#endregion
//#region ../@core/src/kwil-infra/create-kwil-signer.d.ts
type KwilSignerType = KeyPair | Wallet | nacl.SignKeyPair | JsonRpcSigner | Keypair | KeyPair$1;
//#endregion
//#region ../@core/src/kwil-actions/actions.d.ts

declare const GetAccessGrantsGrantedInputSchema: z.ZodObject<{
  user_id: z.ZodNullable<z.ZodUUID>;
  page: z.ZodNumber;
  size: z.ZodNumber;
}>;
type GetAccessGrantsGrantedInput = z.infer<typeof GetAccessGrantsGrantedInputSchema>;
declare const GetAccessGrantsGrantedOutputSchema: z.ZodObject<{
  id: z.ZodUUID;
  ag_owner_user_id: z.ZodUUID;
  ag_grantee_wallet_identifier: z.ZodString;
  data_id: z.ZodUUID;
  locked_until: z.ZodNumber;
  content_hash: z.ZodNullable<z.ZodString>;
  inserter_type: z.ZodString;
  inserter_id: z.ZodString;
}>;
type GetAccessGrantsGrantedOutput = z.infer<typeof GetAccessGrantsGrantedOutputSchema>;
/**

*  As arguments can be undefined (user can not send them at all), we have to have default values: page=1, size=20

*  Page number starts from 1, as UI usually shows to user in pagination element

*  Ordering is consistent because we use height as first ordering parameter

*/

declare const CreateAgByDagForCopyInputSchema: z.ZodObject<{
  dag_owner_wallet_identifier: z.ZodString;
  dag_grantee_wallet_identifier: z.ZodString;
  dag_data_id: z.ZodUUID;
  dag_locked_until: z.ZodNumber;
  dag_content_hash: z.ZodString;
  dag_signature: z.ZodString;
}>;
type CreateAgByDagForCopyInput = z.infer<typeof CreateAgByDagForCopyInputSchema>;
/**

*  Get the wallet type and public key for XRPL/NEAR wallets from database

*  This works for EVM-compatible signatures only

*/

declare const AddPassportingPeerAsOwnerInputSchema: z.ZodObject<{
  id: z.ZodUUID;
  name: z.ZodString;
  issuer_public_key: z.ZodString;
  passporting_server_url_base: z.ZodString;
}>;
type AddPassportingPeerAsOwnerInput = z.infer<typeof AddPassportingPeerAsOwnerInputSchema>;
//#endregion
//#region ../@core/src/kwil-actions/index.d.ts
type idOSGrant = GetAccessGrantsGrantedOutput;
type idOSPassportingPeer = AddPassportingPeerAsOwnerInput;
//#endregion
//#region src/index.d.ts
type idOSConsumerConfig = {
  recipientEncryptionPrivateKey: string;
  nodeUrl?: string;
  chainId?: string;
  consumerSigner: KwilSignerType;
};
declare class idOSConsumer {
  #private;
  readonly address: string;
  static init({
    recipientEncryptionPrivateKey,
    nodeUrl,
    chainId,
    consumerSigner
  }: idOSConsumerConfig): Promise<idOSConsumer>;
  private constructor();
  get signer(): KwilSigner;
  get encryptionPublicKey(): string;
  getCredentialSharedFromIDOS(dataId: string): Promise<idOSCredential | undefined>;
  getCredentialSharedContentDecrypted(dataId: string): Promise<string>;
  rescindSharedCredential(credentialId: string): Promise<void>;
  getGrantsCount(userId?: string | null): Promise<number>;
  getAccessGrantsForCredential(credentialId: string): Promise<idOSGrant>;
  getCredentialsSharedByUser(userId: string): Promise<Omit<idOSCredential, "content">[]>;
  getReusableCredentialCompliantly(credentialId: string): Promise<idOSCredential>;
  getAccessGrants(params: GetAccessGrantsGrantedInput): Promise<{
    grants: idOSGrant[];
    totalCount: number;
  }>;
  createAccessGrantByDag(params: CreateAgByDagForCopyInput): Promise<CreateAgByDagForCopyInput>;
  getPassportingPeers(): Promise<idOSPassportingPeer[]>;
  verifyCredential<K = VerifiableCredentialSubject>(credentials: VerifiableCredential<K>, issuers: AvailableIssuerType[]): Promise<VerifyCredentialResult>;
}
//#endregion
export { type AvailableIssuerType, type Credential, type IDDocumentType, type VerifiableCredential, type VerifiableCredentialSubject, type VerifyCredentialResult, idOSConsumer, idOSConsumerConfig, type idOSCredential, type idOSGrant };
//# sourceMappingURL=index.d.ts.map