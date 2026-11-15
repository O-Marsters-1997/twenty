import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type InputHintProps = {
  children?: React.ReactNode;
  xstyle?: stylex.StyleXStyles;
  danger?: boolean;
};

/**
 * @deprecated Inside `Field.Root` (from `twenty-ui/primitives/input`), use `Field.Description` for hints or `Field.Error` for errors (replaces `danger`).
 */
export const InputHint = ({ children, xstyle, danger }: InputHintProps) => (
  <div {...stylex.props(styles.hint, danger && styles.danger, xstyle)}>
    {children}
  </div>
);

const styles = stylex.create({
  hint: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    marginTop: spacing['--t-spacing-0_5'],
  },
  danger: {
    color: fontColor['--t-font-color-danger'],
  },
});
