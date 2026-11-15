import * as stylex from '@stylexjs/stylex';

import { Dropdown } from '@ui/components/navigation/Dropdown/Dropdown';
import { IconChevronDown } from '@ui/icon';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { currencyPickerStyles } from '../CurrencyPicker.stylex';
import { type CurrencyPickerTriggerProps } from '../types/CurrencyPickerTriggerProps';

export const CurrencyPickerTrigger = ({
  value,
  className,
  ...props
}: CurrencyPickerTriggerProps) => (
  <Dropdown.Trigger
    {...props}
    {...mergeStylexProps(stylex.props(currencyPickerStyles.trigger), className)}
  >
    {value}
    <IconChevronDown
      aria-hidden="true"
      {...stylex.props(currencyPickerStyles.chevron)}
    />
  </Dropdown.Trigger>
);
