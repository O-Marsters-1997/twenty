import { AppErrorBoundary } from '@/error-handler/components/AppErrorBoundary';
import { AppFullScreenErrorFallback } from '@/error-handler/components/AppFullScreenErrorFallback';
import { AppPageErrorFallback } from '@/error-handler/components/AppPageErrorFallback';
import { DefaultLayoutNavigationDrawer } from '@/app/components/DefaultLayoutNavigationDrawer';
import { FileUploadProvider } from '@/file-upload/components/FileUploadProvider';
import { KeyboardShortcutMenu } from '@/keyboard-shortcut-menu/components/KeyboardShortcutMenu';
import { LayoutCustomizationBar } from '@/layout-customization/components/LayoutCustomizationBar';
import { MobileNavigationBar } from '@/navigation/components/MobileNavigationBar';
import { PageDragDropProvider } from '@/navigation-menu-item/display/dnd/providers/PageDragDropProvider';
import { useIsMobile } from 'twenty-ui/utilities';
import { Outlet } from 'react-router-dom';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  background,
  borderColor,
  grayScale,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  layout: {
    background: {
      default: grayScale['--t-gray-scale-gray3'],
      [media.print]: background['--t-background-primary'],
    },
    overflow: { default: 'clip', [media.print]: 'visible' },
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    scrollbarColor: `${borderColor['--t-border-color-medium']} transparent`,
    scrollbarWidth: 'thin',
    height: {
      default: 'calc(100dvh / var(--t-zoom, 1))',
      [media.print]: 'auto',
    },
    minHeight: { default: null, [media.print]: '100%' },
    width: '100%',
  },
  pageContainer: {
    overflow: { default: null, [media.print]: 'visible' },
    display: { default: 'flex', [media.print]: 'block' },
    flexBasis: 'auto',
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: { default: 0, [media.print]: 'auto' },
    minWidth: { default: 0, [media.print]: 'auto' },
  },
  mainContainer: {
    overflow: { default: null, [media.print]: 'visible' },
    display: { default: 'flex', [media.print]: 'block' },
    flexBasis: '100%',
    flexGrow: 0,
    flexShrink: 1,
    minWidth: { default: 0, [media.print]: 'auto' },
  },
});

export const DefaultLayout = () => {
  const isMobile = useIsMobile();

  return (
    <>
      <FileUploadProvider>
        <div {...stylex.props(styles.layout)}>
          <AppErrorBoundary FallbackComponent={AppFullScreenErrorFallback}>
            <LayoutCustomizationBar />
            <div {...stylex.props(styles.pageContainer)}>
              <PageDragDropProvider>
                <KeyboardShortcutMenu />
                <DefaultLayoutNavigationDrawer />
                <div {...stylex.props(styles.mainContainer)}>
                  <AppErrorBoundary FallbackComponent={AppPageErrorFallback}>
                    <Outlet />
                  </AppErrorBoundary>
                </div>
              </PageDragDropProvider>
            </div>
            {isMobile && <MobileNavigationBar />}
          </AppErrorBoundary>
        </div>
      </FileUploadProvider>
    </>
  );
};
