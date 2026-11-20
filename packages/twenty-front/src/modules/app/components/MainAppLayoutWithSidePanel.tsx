import { WorkspaceSetupChatSidePanelEffect } from '@/onboarding/effect-components/WorkspaceSetupChatSidePanelEffect';
import { CommandMenuForMobile } from '@/command-menu/components/CommandMenuForMobile';
import { useCommandMenuHotKeys } from '@/command-menu/hooks/useCommandMenuHotKeys';
import { RouteContextStoreProvider } from '@/context-store/components/RouteContextStoreProvider';
import { LogConsole } from '@/log-console/components/LogConsole';
import { SidePanelForDesktop } from '@/side-panel/components/SidePanelForDesktop';
import { SidePanelPathUrlSyncEffect } from '@/side-panel/routing/components/SidePanelPathUrlSyncEffect';
import { useIsMobile } from 'twenty-ui/utilities';
import { Outlet } from 'react-router-dom';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  row: {
    display: { default: 'flex', [media.print]: 'block' },
    flexBasis: '0%',
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: { default: 0, [media.print]: 'auto' },
    minWidth: { default: 0, [media.print]: 'auto' },
  },
  mainColumn: {
    display: { default: 'flex', [media.print]: 'block' },
    flexBasis: 0,
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    position: 'relative',
    minHeight: { default: 0, [media.print]: 'auto' },
    minWidth: { default: 0, [media.print]: 'auto' },
  },
  content: {
    overflow: { default: null, [media.print]: 'visible' },
    display: { default: 'flex', [media.print]: 'block' },
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: { default: 0, [media.print]: 'auto' },
    minWidth: { default: 0, [media.print]: 'auto' },
  },
  sidePanel: {
    display: { default: 'contents', [media.print]: 'none' },
  },
});

export const MainAppLayoutWithSidePanel = () => {
  const isMobile = useIsMobile();

  useCommandMenuHotKeys();

  return (
    <div {...stylex.props(styles.row)}>
      <RouteContextStoreProvider />
      <SidePanelPathUrlSyncEffect />
      <WorkspaceSetupChatSidePanelEffect />
      <div {...stylex.props(styles.mainColumn)}>
        <div {...stylex.props(styles.content)}>
          <Outlet />
        </div>
        <LogConsole />
      </div>
      {isMobile ? (
        <CommandMenuForMobile />
      ) : (
        <div {...stylex.props(styles.sidePanel)}>
          <SidePanelForDesktop />
        </div>
      )}
    </div>
  );
};
