import { type ReactNode } from 'react';

import { useIsMobile } from 'twenty-ui/utilities';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  outer: {
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  outerMobile: {
    gap: spacing['--t-spacing-3'],
  },
  inner: {
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  innerMobile: {
    flexDirection: 'column',
  },
  scrollWrapperContainer: {
    overflow: 'hidden',
    backgroundColor: background['--t-background-secondary'],
  },
});

export type ShowPageContainerProps = {
  children: ReactNode;
};

export const ShowPageContainer = ({ children }: ShowPageContainerProps) => {
  const isMobile = useIsMobile();

  return isMobile ? (
    <div {...stylex.props(styles.outer, styles.outerMobile)}>
      <div {...stylex.props(styles.scrollWrapperContainer)}>
        <ScrollWrapper componentInstanceId="scroll-wrapper-show-page-container">
          <div {...stylex.props(styles.inner, styles.innerMobile)}>
            {children}
          </div>
        </ScrollWrapper>
      </div>
    </div>
  ) : (
    <div {...stylex.props(styles.outer)}>
      <div {...stylex.props(styles.inner)}>{children}</div>
    </div>
  );
};
