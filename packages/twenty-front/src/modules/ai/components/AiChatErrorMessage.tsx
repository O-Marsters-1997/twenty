import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { t } from '@lingui/core/macro';
import { type ReactNode } from 'react';
import { IconAlertCircle, IconRefresh } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { isDefined } from 'twenty-shared/utils';

import { type AiChatError } from '@/ai/types/AiChatError';
import { useTheme } from 'twenty-ui/theme';
import { getErrorMessageFromApolloError } from '~/utils/get-error-message-from-apollo-error.util';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  errorContainer: {
    alignItems: 'center',
    background: background['--t-background-danger'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-danger'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  errorIcon: {
    alignItems: 'center',
    color: color['--t-color-red'],
    display: 'flex',
  },
  errorContent: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
  },
  errorTitle: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  errorMessage: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-xs'],
    wordBreak: 'break-word',
  },
});

type AiChatErrorMessageProps = {
  error: AiChatError;
  hint?: string;
  onRetry?: () => void;
  action?: ReactNode;
};

export const AiChatErrorMessage = ({
  error,
  hint,
  onRetry,
  action,
}: AiChatErrorMessageProps) => {
  const theme = useTheme();
  const errorMessage = CombinedGraphQLErrors.is(error)
    ? getErrorMessageFromApolloError(error)
    : error.message;

  return (
    <div {...stylex.props(styles.errorContainer)}>
      <div {...stylex.props(styles.errorIcon)}>
        <IconAlertCircle size={theme.icon.size.md} />
      </div>
      <div {...stylex.props(styles.errorContent)}>
        <div
          {...stylex.props(styles.errorTitle)}
        >{t`Failed to get response`}</div>
        <div {...stylex.props(styles.errorMessage)}>
          {errorMessage || t`An error occurred while processing your message`}
        </div>
        {isDefined(hint) && (
          <div {...stylex.props(styles.errorMessage)}>{hint}</div>
        )}
      </div>
      {isDefined(onRetry) && (
        <Button
          size="sm"
          startIcon={<IconRefresh />}
          onClick={onRetry}
          variant="outline"
        >{t`Retry`}</Button>
      )}
      {action}
    </div>
  );
};
