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
import { styled } from '@linaria/react';
import { IconX } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, border, boxShadow } from 'twenty-ui/theme/tokens.stylex';

type SettingsCustomizeVideoModalProps = {
  modalInstanceId: string;
  tabsInstanceId: string;
  tabs: SettingsCustomizeVideoModalTab[];
};

// The tab list draws its own separator, so the header needs one only when it shows a plain title
const StyledHeader = styled.div<{ $hasBottomBorder: boolean }>`
  align-items: center;
  border-bottom: ${({ $hasBottomBorder }) =>
    $hasBottomBorder
      ? `1px solid ${themeCssVariables.border.color.light}`
      : 'none'};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  height: 48px;
  justify-content: space-between;
  padding-right: ${themeCssVariables.spacing[3]};
`;

const styles = stylex.create({
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
    borderTopLeftRadius: border['--t-border-radius-md'],
    borderTopRightRadius: border['--t-border-radius-md'],
    borderBottomRightRadius: border['--t-border-radius-md'],
    borderBottomLeftRadius: border['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    display: 'block',
    height: 'auto',
    maxWidth: '100%',
    width: '960px',
  },
});

const StyledTitle = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex: 1 1 auto;
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding-left: ${themeCssVariables.spacing[5]};

  & > svg {
    flex-shrink: 0;
  }
`;

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
        title={activeTab.title} {...stylex.props(styles.videoIframe)}
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
          style={{ padding: 0 }}
        >
          <TabListRoot
            componentInstanceId={tabsInstanceId}
            enabled={hasMultipleTabs}
          >
            <StyledHeader $hasBottomBorder={!hasMultipleTabs}>
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
                <StyledTitle>
                  <ActiveTabIcon
                    size={theme.icon.size.md}
                    color={theme.font.color.primary}
                    aria-hidden
                  />
                  <span {...stylex.props(styles.titleText)}>{activeTab.title}</span>
                </StyledTitle>
              )}
              <IconButton
                aria-label={t`Close video`}
                onClick={handleClose}
                size="sm"
              >
                <IconX />
              </IconButton>
            </StyledHeader>
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
