import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

type InputLabelProps = {
  children?: React.ReactNode;
  xstyle?: stylex.StyleXStyles;
  htmlFor?: string;
};

/**
 * @deprecated Compose `Field.Label` inside `Field.Root` (from `twenty-ui/primitives/input`) instead.
 */
export const InputLabel = ({ children, xstyle, htmlFor }: InputLabelProps) => (
  <label {...stylex.props(styles.label, xstyle)} htmlFor={htmlFor}>
    {children}
  </label>
);

const styles = stylex.create({
  label: {
    color: fontColor['--t-font-color-light'],
    display: 'block',
    fontSize: 11,
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-1'],
  },
});
