import { type ConnectedAccountEmailFields, type EmailOperation } from '@/types';
import { getEmailProvidersForOperation } from '@/utils/email/getEmailProvidersForOperation';

export const canConnectedAccountPerformEmailOperation = ({
  connectedAccount,
  operation,
}: {
  connectedAccount: ConnectedAccountEmailFields;
  operation: EmailOperation;
}): boolean =>
  getEmailProvidersForOperation(operation).includes(connectedAccount.provider);
