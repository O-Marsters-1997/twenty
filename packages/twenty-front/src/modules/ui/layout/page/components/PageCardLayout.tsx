import { InformationBannerWrapper } from '@/information-banner/components/InformationBannerWrapper';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { type ReactNode } from 'react';
import { media } from 'twenty-ui/theme/constants.stylex';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  boxShadow,
} from 'twenty-ui/theme/tokens.stylex';

type PageCardLayoutProps = {
  header: ReactNode;
  secondaryBar?: ReactNode;
  children: ReactNode;
  showInformationBanner?: boolean;
};

const styles = stylex.create({
  root: {
    display: { default: 'flex', [media.print]: 'block' },
    flex: 1,
    flexDirection: 'row',
    minHeight: { default: 0, [media.print]: 'auto' },
    minWidth: { default: 0, [media.print]: 'auto' },
  },
  mainCardWrapper: {
    boxSizing: 'border-box',
    display: { default: 'flex', [media.print]: 'block' },
    flex: '1 1 0',
    minWidth: { default: 0, [media.print]: 'auto' },
    width: { default: 0, [media.print]: 'auto' },
  },
  card: {
    backgroundColor: background['--t-background-primary'],
    borderLeftColor: borderColor['--t-border-color-medium'],
    borderLeftStyle: {
      default: 'solid',
      [media.mobile]: 'none',
      [media.print]: 'none',
    },
    borderLeftWidth: '1px',
    borderRadius: 0,
    boxShadow: {
      default: boxShadow['--t-box-shadow-sidebar'],
      [media.mobile]: 'none',
      [media.print]: 'none',
    },
    boxSizing: 'border-box',
    display: { default: 'flex', [media.print]: 'block' },
    flex: 1,
    flexDirection: 'column',
    minHeight: { default: 0, [media.print]: 'auto' },
    overflow: { default: 'hidden', [media.print]: 'visible' },
    width: '100%',
  },
  bodyContent: {
    display: { default: 'flex', [media.print]: 'block' },
    flex: 1,
    flexDirection: 'column',
    minHeight: { default: 0, [media.print]: 'auto' },
    width: '100%',
  },
  printHidden: {
    display: { default: null, [media.print]: 'none' },
  },
  sidePanelSurface: {
    background: background['--t-background-primary'],
    display: 'flex',
    flex: '1 1 0',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
    minWidth: '0',
    overflow: 'hidden',
    width: '100%',
  },
});

export const PageCardLayout = ({
  header,
  secondaryBar,
  children,
  showInformationBanner = true,
}: PageCardLayoutProps) => {
  const workspaceSurface = useWorkspaceSurface();
  const shouldShowInformationBanner =
    showInformationBanner && workspaceSurface.type === 'main';

  const body = <div {...stylex.props(styles.bodyContent)}>{children}</div>;

  if (workspaceSurface.type === 'side-panel') {
    return (
      <div
        data-page-surface="side-panel"
        {...stylex.props(styles.sidePanelSurface)}
      >
        {header}
        <div {...stylex.props(styles.printHidden)}>{secondaryBar}</div>
        {body}
      </div>
    );
  }

  return (
    <div data-page-surface="main" {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.mainCardWrapper)}>
        <div {...stylex.props(styles.card)}>
          <div {...stylex.props(styles.printHidden)}>{header}</div>
          {shouldShowInformationBanner && (
            <div {...stylex.props(styles.printHidden)}>
              <InformationBannerWrapper />
            </div>
          )}
          <div {...stylex.props(styles.printHidden)}>{secondaryBar}</div>
          {body}
        </div>
      </div>
    </div>
  );
};
