import { useLingui } from '@lingui/react/macro';
import { type KeyboardEvent, useState } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconX } from 'twenty-ui/icon';
import { Chip } from 'twenty-ui/primitives/data-display';

import { type EmailRecipient } from '@/activities/emails/recipients/types/EmailRecipient';
import { parseEmailRecipients } from '@/activities/emails/recipients/utils/parseEmailRecipients';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-1'],
    minHeight: '28px',
  },
  rowLabel: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    width: '32px',
  },
  input: {
    background: 'transparent',
    borderStyle: 'none',
    color: { default: fontColor['--t-font-color-primary'], '::placeholder': fontColor['--t-font-color-light'] },
    flex: '1 0 80px',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    minWidth: '80px',
    outline: 'none',
  },
});

type AiChatEmailRecipientsRowProps = {
  label: string;
  recipients: EmailRecipient[];
  disabled: boolean;
  onChange: (recipients: EmailRecipient[]) => void;
};

export const AiChatEmailRecipientsRow = ({
  label,
  recipients,
  disabled,
  onChange,
}: AiChatEmailRecipientsRowProps) => {
  const { t } = useLingui();
  const [draftRecipient, setDraftRecipient] = useState('');

  const addDraftRecipients = () => {
    const addedRecipients = parseEmailRecipients(draftRecipient).filter(
      ({ address }) =>
        !recipients.some((recipient) => recipient.address === address),
    );

    setDraftRecipient('');

    if (addedRecipients.length > 0) {
      onChange([...recipients, ...addedRecipients]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addDraftRecipients();

      return;
    }

    if (
      event.key === 'Backspace' &&
      draftRecipient.length === 0 &&
      recipients.length > 0
    ) {
      onChange(recipients.slice(0, -1));
    }
  };

  return (
    <div {...stylex.props(styles.row)}>
      <span {...stylex.props(styles.rowLabel)}>{label}</span>
      {recipients.map(({ address }) => (
        <Chip
          key={address}
          variant="soft"
          endElement={
            disabled ? undefined : (
              <LightIconButton
                size="sm"
                aria-label={t`Remove ${address}`}
                onClick={() =>
                  onChange(
                    recipients.filter(
                      (recipient) => recipient.address !== address,
                    ),
                  )
                }
              >
                <IconX />
              </LightIconButton>
            )
          }
        >
          {address}
        </Chip>
      ))}
      {!disabled && (
        <input
          aria-label={t`Add a recipient to ${label}`}
          placeholder={recipients.length === 0 ? t`Add recipient` : undefined}
          value={draftRecipient}
          onChange={(event) => setDraftRecipient(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addDraftRecipients} {...stylex.props(styles.input)}
        />
      )}
    </div>
  );
};
