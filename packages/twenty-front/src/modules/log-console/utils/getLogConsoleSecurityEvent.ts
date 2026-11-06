import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type ThemeColor } from 'twenty-ui/theme';

import { type LogConsoleSeverity } from '@/log-console/types/LogConsoleSeverity';
import { type EventLogRecord } from '~/generated-metadata/graphql';

export const getLogConsoleSecurityEvent = (
  entry: EventLogRecord,
):
  | {
      label: MessageDescriptor;
      color: ThemeColor;
      severity?: LogConsoleSeverity;
    }
  | undefined => {
  switch (entry.properties?.action ?? entry.event) {
    case 'user_signed_in':
      return { label: msg`Signed in`, color: 'blue' };
    case 'user_signed_out':
      return { label: msg`Logged out`, color: 'gray' };
    case 'session_revoked':
      return { label: msg`Session revoked`, color: 'orange' };
    case 'User Signup':
      return { label: msg`Signed up`, color: 'green' };
    case 'Custom Domain Activated':
      return {
        label: msg`Custom domain activated`,
        color: 'turquoise',
      };
    case 'Custom Domain Deactivated':
      return {
        label: msg`Custom domain deactivated`,
        color: 'orange',
      };
    case 'ServerAdminAccessChanged':
      return {
        label: msg`Server administrator access updated`,
        color: 'orange',
        severity: 'warning',
      };
    default:
      return undefined;
  }
};
