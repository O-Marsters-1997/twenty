import { useLingui } from '@lingui/react/macro';
import React, { useMemo } from 'react';

import { type FieldEmailsValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { OverflowingList } from 'twenty-ui/components/layout';
import { isDefined } from 'twenty-shared/utils';
import { RoundedLink } from '@/ui/navigation/link/components/RoundedLink/RoundedLink';
import * as stylex from '@stylexjs/stylex';

type EmailsDisplayProps = {
  value?: FieldEmailsValue;
  isFocused?: boolean;
  onEmailClick?: (email: string, event: React.MouseEvent<HTMLElement>) => void;
};

const styles = stylex.create({
  container: {
    gap: '4px',
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-start',
    maxWidth: '100%',
    width: '100%',
  },
});

export const EmailsDisplay = ({
  value,
  isFocused,
  onEmailClick,
}: EmailsDisplayProps) => {
  const { t } = useLingui();

  const emails = useMemo(
    () =>
      [
        value?.primaryEmail ? value.primaryEmail : null,
        ...(value?.additionalEmails ?? []),
      ].filter(isDefined),
    [value?.primaryEmail, value?.additionalEmails],
  );

  return isFocused ? (
    <OverflowingList overflowLabel={t`Show all items`} showOverflowCount>
      {emails.map((email, index) => (
        <RoundedLink
          key={index}
          label={email}
          href={`mailto:${email}`}
          onClick={(event) => onEmailClick?.(email, event)}
        />
      ))}
    </OverflowingList>
  ) : (
    <div {...stylex.props(styles.container)}>
      {emails.map((email, index) => (
        <RoundedLink
          key={index}
          label={email}
          href={`mailto:${email}`}
          onClick={(event) => onEmailClick?.(email, event)}
        />
      ))}
    </div>
  );
};
