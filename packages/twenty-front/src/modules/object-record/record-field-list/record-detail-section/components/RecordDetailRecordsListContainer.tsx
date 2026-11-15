import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    color: fontColor['--t-font-color-secondary'],
  },
});

export const RecordDetailRecordsListContainer = ({
  children,
}: {
  children: ReactNode;
}) => <div {...stylex.props(styles.container)}>{children}</div>;
