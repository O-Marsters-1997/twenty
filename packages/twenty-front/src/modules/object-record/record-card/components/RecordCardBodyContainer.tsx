import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import './RecordCardBodyContainer.css';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-0_5'],
    display: 'flex',
    flexDirection: 'column',
  },
  defaultPadding: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: 10,
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: 0,
  },
  padding: (padding: string) => ({ padding }),
});

type RecordCardBodyContainerProps = {
  children: ReactNode;
  padding?: string;
};

export const RecordCardBodyContainer = ({
  children,
  padding,
}: RecordCardBodyContainerProps) => (
  <div
    {...mergeClassName(
      stylex.props(
        styles.container,
        padding === undefined ? styles.defaultPadding : styles.padding(padding),
      ),
      'record-card-body-container',
    )}
  >
    {children}
  </div>
);
