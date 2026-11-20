import { zIndex } from '@/ui/layout/constants/layout.stylex';
import { PageHeader } from '@/ui/layout/page/components/PageHeader';
import { Breadcrumb } from '@/ui/navigation/bread-crumb/components/Breadcrumb';
import { type BreadcrumbProps } from '@/ui/navigation/bread-crumb/types/BreadcrumbProps';
import { forwardRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  overlay: {
    background: background['--t-background-noisy'],
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: zIndex.rootModal,
    bottom: 0,
    height: 'calc(100vh / var(--t-zoom, 1))',
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
  },
  content: {
    flex: 1,
    gap: spacing['--t-spacing-3'],
    paddingInline: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    paddingBottom: spacing['--t-spacing-3'],
    paddingTop: 0,
  },
  fullScreenHeaderContainer: {
    paddingLeft: spacing['--t-spacing-3'],
  },
});

type FullScreenModalProps = {
  children: React.ReactNode;
  links: BreadcrumbProps['links'];
  onClose: () => void;
  hasClosePageButton?: boolean;
};

export const FullScreenModal = forwardRef<HTMLDivElement, FullScreenModalProps>(
  ({ children, links, onClose, hasClosePageButton = true }, ref) => {
    return (
      <div
        ref={ref}
        {...stylex.props(styles.overlay)}
        data-globally-prevent-click-outside="true"
        tabIndex={-1}
      >
        <div {...stylex.props(styles.fullScreenHeaderContainer)}>
          <PageHeader
            title={<Breadcrumb links={links} />}
            hasClosePageButton={hasClosePageButton}
            onClosePage={onClose}
          />
        </div>
        <div {...stylex.props(styles.content)}>{children}</div>
      </div>
    );
  },
);
