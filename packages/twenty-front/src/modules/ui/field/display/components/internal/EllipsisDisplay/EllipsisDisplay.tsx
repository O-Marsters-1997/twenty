import * as stylex from '@stylexjs/stylex';
import { Text } from 'twenty-ui/primitives/typography';
import { isDefined } from 'twenty-shared/utils';

const styles = stylex.create({
  ellipsis: {
    alignItems: 'center',
    display: 'flex',
    height: '20px',
    maxWidth: '100%',
    width: '100%',
  },
  maxWidth: (maxWidth: number) => ({
    maxWidth: `${maxWidth}px`,
  }),
});

type EllipsisDisplayProps = {
  children: React.ReactNode;
  maxWidth?: number;
  xstyle?: stylex.StyleXStyles;
};

export const EllipsisDisplay = ({
  children,
  maxWidth,
  xstyle,
}: EllipsisDisplayProps) => (
  <Text
    truncate
    {...stylex.props(
      styles.ellipsis,
      isDefined(maxWidth) && styles.maxWidth(maxWidth),
      xstyle,
    )}
  >
    {children}
  </Text>
);
