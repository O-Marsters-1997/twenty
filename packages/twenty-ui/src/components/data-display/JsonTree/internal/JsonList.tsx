import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { spacing } from '../../../../theme/tokens.stylex';

export const JsonList = ({
  depth,
  className,
  children,
}: {
  depth: number;
  className?: string;
  children?: React.ReactNode;
}) => (
  <ul
    {...mergeStylexProps(
      stylex.props(styles.list, depth > 0 && styles.nested),
      className,
    )}
  >
    {children}
  </ul>
);

const styles = stylex.create({
  list: {
    display: 'grid',
    margin: 0,
    paddingBlock: 0,
    paddingInline: 0,
    rowGap: spacing['--t-spacing-2'],
  },
  nested: {
    paddingBlockStart: spacing['--t-spacing-2'],
    paddingInlineStart: spacing['--t-spacing-8'],
  },
});
