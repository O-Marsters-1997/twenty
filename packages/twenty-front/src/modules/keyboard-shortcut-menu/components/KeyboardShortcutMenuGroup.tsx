import * as stylex from '@stylexjs/stylex';
import { color, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  groupHeading: {
    color: color['--t-color-gray10'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-4'],
  },
});

type KeyboardMenuGroupProps = {
  heading: string;
  children: React.ReactNode | React.ReactNode[];
};

export const KeyboardMenuGroup = ({
  heading,
  children,
}: KeyboardMenuGroupProps) => {
  return (
    <div {...stylex.props(styles.group)}>
      <label {...stylex.props(styles.groupHeading)}>{heading}</label>
      {children}
    </div>
  );
};
