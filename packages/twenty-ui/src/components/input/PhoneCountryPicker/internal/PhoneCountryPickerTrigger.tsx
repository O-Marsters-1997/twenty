import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';

import { Dropdown } from '@ui/components/navigation/Dropdown/Dropdown';
import { IconChevronDown, IconWorld } from '@ui/icon';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../../styles/focus.stylex';
import '../PhoneCountryPicker.css';
import { phoneCountryPickerStyles } from '../PhoneCountryPicker.stylex';
import { type PhoneCountryPickerTriggerProps } from '../types/PhoneCountryPickerTriggerProps';

export const PhoneCountryPickerTrigger = ({
  country,
  className,
  'aria-describedby': ariaDescribedBy,
  ...props
}: PhoneCountryPickerTriggerProps) => {
  const selectedCountryLabelId = useId();
  const describedBy =
    [isDefined(country) && selectedCountryLabelId, ariaDescribedBy]
      .filter(isNonEmptyString)
      .join(' ') || undefined;

  return (
    <Dropdown.Trigger
      {...props}
      aria-describedby={describedBy}
      {...mergeStylexProps(
        stylex.props(focusStyles.ring, phoneCountryPickerStyles.trigger),
        className,
      )}
    >
      <span
        {...mergeStylexProps(
          stylex.props(phoneCountryPickerStyles.flag),
          'tw-phone-country-flag tw-phone-country-trigger-flag',
        )}
        aria-hidden
      >
        {country?.flag ?? <IconWorld />}
      </span>
      {isDefined(country) && (
        <span
          id={selectedCountryLabelId}
          {...stylex.props(phoneCountryPickerStyles.selectedCountryLabel)}
        >
          {country.label}
        </span>
      )}
      <IconChevronDown
        {...stylex.props(phoneCountryPickerStyles.chevron)}
        aria-hidden
      />
    </Dropdown.Trigger>
  );
};
