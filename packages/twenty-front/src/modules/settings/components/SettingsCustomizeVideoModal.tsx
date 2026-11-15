import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { type SettingsCustomizeVideoModalTab } from '@/settings/types/SettingsCustomizeVideoModalTab';
import { TabListRoot } from '@/ui/layout/tab-list/components/TabListRoot';
import { Tabs } from 'twenty-ui/primitives/navigation';
import { t } from '@lingui/core/macro';
import { DialogInstance } from '@/ui/layout/dialog/components/DialogInstance';
import { Dialog } from 'twenty-ui/primitives/surfaces';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';
import { TabList } from '@/ui/layout/tab-list/components/TabList';
import { IconX } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
  boxShadow,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsCustomizeVideoModalProps = {
  modalInstanceId: string;
  tabsInstanceId: string;
  tabs: SettingsCustomizeVideoModalTab[];
};

const styles = stylex.create({
  popup: {
    padding: 0,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    height: '48px',
    justifyContent: 'space-between',
    paddingRight: spacing['--t-spacing-3'],
  },
  headerWithBottomBorder: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  title: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flex: '1 1 auto',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
    paddingLeft: spacing['--t-spacing-5'],
  },
  titleIcon: {
    display: 'flex',
    flexShrink: 0,
  },
  tabsContainer: {
    flex: '1 1 auto',
    minWidth: '0',
    paddingLeft: spacing['--t-spacing-3'],
  },
  titleText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  videoContainer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-6'],
    paddingRight: spacing['--t-spacing-6'],
    paddingBottom: spacing['--t-spacing-6'],
    paddingLeft: spacing['--t-spacing-6'],
  },
  videoIframe: {
    aspectRatio: '1440 / 900',
    borderWidth: '0',
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    display: 'block',
    height: 'auto',
    maxWidth: '100%',
    width: '960px',
  },
});

export const SettingsCustomizeVideoModal = ({
  modalInstanceId,
  tabsInstanceId,
  tabs,
}: SettingsCustomizeVideoModalProps) => {
  const theme = useTheme();
  const { closeDialog } = useDialog();
  const activeTabId = useAtomComponentStateValue(
    activeTabIdComponentState,
    tabsInstanceId,
  );

  if (tabs.length === 0) {
    return null;
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const hasMultipleTabs = tabs.length > 1;
  const ActiveTabIcon = activeTab.Icon;

  const handleClose = () => {
    closeDialog(modalInstanceId);
  };

  const videoContent = (
    <div {...stylex.props(styles.videoContainer)}>
      <iframe
        key={activeTab.id}
        src={
          activeTab.hasSound
            ? `https://player.vimeo.com/video/${activeTab.vimeoId}?byline=0&portrait=0&title=0&vimeo_logo=0&app_id=58479&dnt=1`
            : `https://player.vimeo.com/video/${activeTab.vimeoId}?autoplay=1&loop=1&autopause=0&background=1&muted=1&dnt=1`
        }
        allow="autoplay; fullscreen; picture-in-picture"
        title={activeTab.title}
        {...stylex.props(styles.videoIframe)}
      />
    </div>
  );

  return (
    <DialogInstance
      dialogId={modalInstanceId}
      dismissible
      onClose={handleClose}
      renderInDocumentBody
    >
      {({ onKeyDown }) => (
        <Dialog.Popup
          aria-label={activeTab.title}
          onKeyDown={onKeyDown}
          size="lg"
          {...stylex.props(styles.popup)}
        >
          <TabListRoot
            componentInstanceId={tabsInstanceId}
            enabled={hasMultipleTabs}
          >
            <div
              {...stylex.props(
                styles.header,
                !hasMultipleTabs && styles.headerWithBottomBorder,
              )}
            >
              {hasMultipleTabs ? (
                <div {...stylex.props(styles.tabsContainer)}>
                  <TabList
                    aria-label={t`Video tutorials`}
                    tabs={tabs}
                    behaveAsLinks={false}
                    componentInstanceId={tabsInstanceId}
                  />
                </div>
              ) : (
                <div {...stylex.props(styles.title)}>
                  <span {...stylex.props(styles.titleIcon)}>
                    <ActiveTabIcon
                      size={theme.icon.size.md}
                      color={theme.font.color.primary}
                      aria-hidden
                    />
                  </span>
                  <span {...stylex.props(styles.titleText)}>
                    {activeTab.title}
                  </span>
                </div>
              )}
              <IconButton
                aria-label={t`Close video`}
                onClick={handleClose}
                size="sm"
              >
                <IconX />
              </IconButton>
            </div>
            {hasMultipleTabs ? (
              <Tabs.Panel value={activeTab.id}>{videoContent}</Tabs.Panel>
            ) : (
              videoContent
            )}
          </TabListRoot>
        </Dialog.Popup>
      )}
    </DialogInstance>
  );
};
