import { t } from '@lingui/core/macro';
import { type InputHTMLAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  searchRow: {
    alignItems: 'center',
    boxSizing: 'content-box',
    display: 'flex',
    minHeight: '20px',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: '0',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: '0',
    width: '100%',
  },
  input: {
    backgroundColor: 'transparent',
    borderStyle: 'none',
    color: {
      default: fontColor['--t-font-color-primary'],
      '::placeholder': fontColor['--t-font-color-light'],
    },
    fontFamily: {
      default: font['--t-font-family'],
      '::placeholder': font['--t-font-family'],
    },
    fontSize: 'inherit',
    fontWeight: {
      default: 'inherit',
      '::placeholder': fontWeight['--t-font-weight-medium'],
    },
    outline: 'none',
    paddingTop: spacing['--t-spacing-0'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: spacing['--t-spacing-2'],
    width: '100%',
  },
});

type OverlayMenuListSearchRowProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'placeholder'
>;

const focusSearchInput = (input: HTMLInputElement | null) => {
  input?.focus({ preventScroll: true });
};

export const OverlayMenuListSearchRow = ({
  value,
  onChange,
  placeholder = t`Search`,
}: OverlayMenuListSearchRowProps) => {
  return (
    <div {...stylex.props(styles.searchRow)}>
      <input
        ref={focusSearchInput}
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        {...stylex.props(styles.input)}
      />
    </div>
  );
};
