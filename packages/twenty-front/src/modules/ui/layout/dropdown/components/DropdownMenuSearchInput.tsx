import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useInputFocusWithoutScrollOnMount } from '@/ui/input/hooks/useInputFocusWithoutScrollOnMount';
import { forwardRef, type InputHTMLAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dropdownMenuSearchInputContainer: {
    '--vertical-padding': spacing['--t-spacing-2'],
    alignItems: 'center',
    boxSizing: 'content-box',
    display: 'flex',
    flexDirection: 'row',
    minHeight: 'calc(36px - 2 * var(--vertical-padding))',
    paddingTop: 'var(--vertical-padding)',
    paddingRight: '0',
    paddingBottom: 'var(--vertical-padding)',
    paddingLeft: '0',
    width: '100%',
  },
  input: {
    appearance: {
      default: null,
      ':is([type=number])': 'textfield',
    },
    backgroundColor: 'transparent',
    borderStyle: 'none',
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    outlineStyle: 'none',
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: spacing['--t-spacing-2'],
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontFamily: font['--t-font-family'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
    '::-webkit-outer-spin-button': { appearance: 'none', margin: 0 },
    '::-webkit-inner-spin-button': { appearance: 'none', margin: 0 },
  },
});

const defaultSearchPlaceholder = msg`Search`;

export const DropdownMenuSearchInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ value, onChange, placeholder, type }, forwardedRef) => {
  const { i18n } = useLingui();
  const { inputRef } = useInputFocusWithoutScrollOnMount();
  const ref = forwardedRef ?? inputRef;
  const translatedPlaceholder = placeholder ?? i18n._(defaultSearchPlaceholder);
  return (
    <div {...stylex.props(styles.dropdownMenuSearchInputContainer)}>
      <input
        {...stylex.props(styles.input)}
        autoComplete="off"
        {...{ onChange, placeholder: translatedPlaceholder, type, value }}
        ref={ref}
      />
    </div>
  );
});
