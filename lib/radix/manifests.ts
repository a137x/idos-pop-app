import { TransactionManifest } from '@radixdlt/radix-engine-toolkit';

interface IssuePopNftParams {
  backendAccountAddress: string;
  componentAddress: string;
  componentAdminBadge: string;
  idosCredentialId: string;
  idosIssuerId: string;
  recipientAddress: string;
}

export function buildIssuePopNftManifest({
  backendAccountAddress,
  componentAddress,
  componentAdminBadge,
  idosCredentialId,
  idosIssuerId,
  recipientAddress,
}: IssuePopNftParams): TransactionManifest {
  const manifestString = `
CALL_METHOD
  Address("${backendAccountAddress}")
  "lock_fee"
  Decimal("5")
;

CALL_METHOD
  Address("${backendAccountAddress}")
  "create_proof_of_amount"
  Address("${componentAdminBadge}")
  Decimal("1")
;

CALL_METHOD
  Address("${componentAddress}")
  "issue_pop"
  Tuple(
    "${idosCredentialId}",
    "${idosIssuerId}"
  )
  Address("${recipientAddress}")
;
`;

  return {
    instructions: {
      kind: 'String',
      value: manifestString.trim(),
    },
    blobs: [],
  } as TransactionManifest;
}
