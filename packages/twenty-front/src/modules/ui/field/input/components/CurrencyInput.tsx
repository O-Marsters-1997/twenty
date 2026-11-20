import { isDefined } from 'twenty-shared/utils';
import { useEffect, useRef, useState } from 'react';

import { useRegisterInputEvents } from '@/ui/input/hooks/useRegisterInputEvents';
import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { CURRENCIES } from '@/ui/input/components/internal/currency/constants/Currencies';
import { CurrencyPickerDropdownButton } from '@/ui/input/components/internal/currency/components/CurrencyPickerDropdownButton';
import { CURRENCY_MICROS_DECIMAL_PLACES } from '@/ui/field/input/constants/CurrencyMicrosDecimalPlaces';
import { IMaskInput } from 'react-imask';
import { useTheme } from 'twenty-ui/theme';
import { getSeparatorsForNumberFormat } from '@/localization/utils/getSeparatorsForNumberFormat';
import * as stylex from '@stylexjs/stylex';
import {
  font,
  fontColor,
  fontWeight,
  iconSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  maskInput: {
    borderWidth: '0',
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: spacing['--t-spacing-1_5'],
    backgroundColor: 'transparent',
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    outlineStyle: 'none',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontFamily: font['--t-font-family'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  iconContainer: {
    alignItems: 'center',
    display: 'flex',
  },
  icon: {
    color: fontColor['--t-font-color-tertiary'],
    height: `${iconSize['--t-icon-size-md']}px`,
    paddingLeft: spacing['--t-spacing-1'],
    width: `${iconSize['--t-icon-size-md']}px`,
  },
});

export type CurrencyInputProps = {
  instanceId: string;
  placeholder?: string;
  autoFocus?: boolean;
  value: string;
  currencyCode: string;
  onEnter: (newText: string) => void;
  onEscape: (newText: string) => void;
  onTab?: (newText: string) => void;
  onShiftTab?: (newText: string) => void;
  onClickOutside: (event: MouseEvent | TouchEvent, inputValue: string) => void;
  onChange?: (newText: string) => void;
  onSelect?: (newText: string) => void;
};

export const CurrencyInput = ({
  instanceId,
  autoFocus,
  value,
  currencyCode,
  placeholder,
  onEnter,
  onEscape,
  onTab,
  onShiftTab,
  onClickOutside,
  onChange,
  onSelect,
}: CurrencyInputProps) => {
  const theme = useTheme();
  const [internalText, setInternalText] = useState(value);
  const { numberFormat } = useNumberFormat();

  const wrapperRef = useRef<HTMLInputElement>(null);

  const { thousandsSeparator, radix } =
    getSeparatorsForNumberFormat(numberFormat);

  // imask re-emits accept while formatting the incoming value, with no
  // originating input event; only a user keystroke may change the draft
  const handleAccept = (value: string, event?: InputEvent) => {
    if (!isDefined(event)) {
      return;
    }

    setInternalText(value);
    onChange?.(value);
  };

  const handleCurrencyChange = (newCurrencyCode: string) => {
    onSelect?.(newCurrencyCode);
  };

  useRegisterInputEvents({
    focusId: instanceId,
    inputRef: wrapperRef,
    inputValue: internalText,
    onEnter,
    onEscape,
    onClickOutside,
    onTab,
    onShiftTab,
  });

  const currency = CURRENCIES.find(({ value }) => value === currencyCode);

  useEffect(() => {
    setInternalText(value);
  }, [value]);

  const Icon = currency?.Icon;

  return (
    <div ref={wrapperRef} {...stylex.props(styles.container)}>
      <CurrencyPickerDropdownButton
        selectedCurrencyCode={currencyCode}
        onChange={handleCurrencyChange}
      />
      <div {...stylex.props(styles.iconContainer)}>
        {isDefined(Icon) && (
          <Icon
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
            {...stylex.props(styles.icon)}
          />
        )}
      </div>
      <IMaskInput
        mask={Number}
        thousandsSeparator={thousandsSeparator}
        radix={radix}
        scale={CURRENCY_MICROS_DECIMAL_PLACES}
        onAccept={(value: string, _maskRef: unknown, event?: InputEvent) =>
          handleAccept(value, event)
        }
        inputRef={wrapperRef}
        autoComplete="off"
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        unmask
        className={stylex.props(styles.maskInput).className}
      />
    </div>
  );
};
