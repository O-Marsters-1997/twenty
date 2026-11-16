import { type JSX } from 'react';
import { PageHeader } from '@/ui/layout/page/components/PageHeader';
import { layoutSize } from '@/ui/layout/constants/layout.stylex';
import { Breadcrumb } from '@/ui/navigation/bread-crumb/components/Breadcrumb';
import { type BreadcrumbProps } from '@/ui/navigation/bread-crumb/types/BreadcrumbProps';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { background, spacing } from 'twenty-ui/theme/tokens.stylex';

type FullScreenContainerProps = {
  children: JSX.Element | JSX.Element[];
  links: BreadcrumbProps['links'];
  exitFullScreen(): void;
};

const styles = stylex.create({
  fullScreen: {
    background: background['--t-background-noisy'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  mainContainer: {
    height: `calc(100% - ${layoutSize.pageBarMinHeight} - ${spacing['--t-spacing-9']})`,
    paddingBottom: spacing['--t-spacing-3'],
    paddingInline: spacing['--t-spacing-3'],
    paddingTop: 0,
  },
  pageHeaderContainer: {
    paddingLeft: spacing['--t-spacing-3'],
  },
});

export const FullScreenContainer = ({
  children,
  links,
  exitFullScreen,
}: FullScreenContainerProps) => {
  const isMobile = useIsMobile();

  return (
    <div {...stylex.props(styles.fullScreen)}>
      <div {...stylex.props(styles.pageHeaderContainer)}>
        <PageHeader
          title={<Breadcrumb links={links} />}
          hasClosePageButton={!isMobile}
          onClosePage={exitFullScreen}
        />
      </div>
      <div {...stylex.props(styles.mainContainer)}>{children}</div>
    </div>
  );
};
