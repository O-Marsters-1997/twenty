import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

const styles = stylex.create({
  container: {
    height: '320px',
    width: '100%',
  },
});

export const RecordPickerInitialLoadingEmptyContainer = ({
  children,
}: {
  children?: ReactNode;
}) => <div {...stylex.props(styles.container)}>{children}</div>;
