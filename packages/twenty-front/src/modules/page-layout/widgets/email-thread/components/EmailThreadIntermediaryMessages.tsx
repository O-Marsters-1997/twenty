import { useState } from 'react';

import { EmailThreadMessage } from '@/activities/emails/components/EmailThreadMessage';
import { type EmailThreadMessageWithSender } from '@/activities/emails/types/EmailThreadMessageWithSender';
import { t } from '@lingui/core/macro';
import { IconArrowsVertical } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  buttonContainer: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-6'],
    paddingRight: spacing['--t-spacing-6'],
    paddingTop: spacing['--t-spacing-4'],
  },
});

export const EmailThreadIntermediaryMessages = ({
  messages,
  onDraftClick,
}: {
  messages: EmailThreadMessageWithSender[];
  onDraftClick: (message: EmailThreadMessageWithSender) => void;
}) => {
  const [areMessagesOpen, setAreMessagesOpen] = useState(false);
  const messagesLength = messages.length;

  if (messagesLength === 0) {
    return null;
  }

  return areMessagesOpen ? (
    messages.map((message) => (
      <EmailThreadMessage
        key={message.id}
        message={message}
        onDraftClick={onDraftClick}
      />
    ))
  ) : (
    <div {...stylex.props(styles.buttonContainer)}>
      <Button
        startIcon={<IconArrowsVertical />}
        size="sm"
        onClick={() => setAreMessagesOpen(true)}
      >{t`${messagesLength} emails`}</Button>
    </div>
  );
};
