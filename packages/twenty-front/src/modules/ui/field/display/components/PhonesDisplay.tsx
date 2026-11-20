import { useLingui } from '@lingui/react/macro';
import { createPhonesFromFieldValue } from '@/object-record/record-field/ui/meta-types/input/utils/phonesUtils';
import { type FieldPhonesValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { OverflowingList } from 'twenty-ui/components/layout';
import { parsePhoneNumber } from 'libphonenumber-js';
import React, { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { RoundedLink } from '@/ui/navigation/link/components/RoundedLink/RoundedLink';
import * as stylex from '@stylexjs/stylex';

type PhonesDisplayProps = {
  value?: FieldPhonesValue;
  isFocused?: boolean;
  onPhoneNumberClick?: (
    phoneNumber: string,
    event: React.MouseEvent<HTMLElement>,
  ) => void;
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

export const PhonesDisplay = ({
  value,
  isFocused,
  onPhoneNumberClick,
}: PhonesDisplayProps) => {
  const { t } = useLingui();

  const phones = useMemo(() => {
    if (!isDefined(value)) {
      return [];
    }

    return createPhonesFromFieldValue(value);
  }, [value]);
  const parsePhoneNumberOrReturnInvalidValue = (number: string) => {
    try {
      return { parsedPhone: parsePhoneNumber(number) };
    } catch {
      return { invalidPhone: number };
    }
  };

  return isFocused ? (
    <OverflowingList overflowLabel={t`Show all items`} showOverflowCount>
      {phones.map(({ number, callingCode }, index) => {
        const { parsedPhone, invalidPhone } =
          parsePhoneNumberOrReturnInvalidValue(callingCode + number);
        const URI = parsedPhone?.getURI();
        return (
          <RoundedLink
            key={index}
            href={URI || ''}
            dir="ltr"
            label={
              parsedPhone ? parsedPhone.formatInternational() : invalidPhone
            }
            onClick={(event) =>
              onPhoneNumberClick?.(callingCode + number, event)
            }
          />
        );
      })}
    </OverflowingList>
  ) : (
    <div {...stylex.props(styles.container)}>
      {phones.map(({ number, callingCode }, index) => {
        const { parsedPhone, invalidPhone } =
          parsePhoneNumberOrReturnInvalidValue(callingCode + number);
        const URI = parsedPhone?.getURI();
        return (
          <RoundedLink
            key={index}
            href={URI || ''}
            dir="ltr"
            label={
              parsedPhone ? parsedPhone.formatInternational() : invalidPhone
            }
            onClick={(event) =>
              onPhoneNumberClick?.(callingCode + number, event)
            }
          />
        );
      })}
    </div>
  );
};
