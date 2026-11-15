import { useSwitchToNewAiChat } from '@/ai/hooks/useSwitchToNewAiChat';
import { SidePanelObjectFilterDropdown } from '@/side-panel/components/SidePanelObjectFilterDropdown';
import { sidePanelPageInfoSelector } from '@/side-panel/states/sidePanelPageInfoSelector';
import { sidePanelSearchObjectFilterState } from '@/side-panel/states/sidePanelSearchObjectFilterState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { SidePanelPages } from 'twenty-shared/types';
import { IconEdit } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/components/input';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  iconButtonContainer: {
    color: fontColor['--t-font-color-secondary'],
  },
});

export const SidePanelTopBarRightCornerIcon = () => {
  const isMobile = useIsMobile();
  const sidePanelPage = useAtomStateValue(sidePanelPageInfoSelector).page;
  const { switchToNewChat } = useSwitchToNewAiChat();
  const [sidePanelSearchObjectFilter, setSidePanelSearchObjectFilter] =
    useAtomState(sidePanelSearchObjectFilterState);

  const isOnSearchPage = sidePanelPage === SidePanelPages.SearchRecords;

  if (isOnSearchPage) {
    return (
      <SidePanelObjectFilterDropdown
        selectedObjectNameSingular={sidePanelSearchObjectFilter}
        onSelectObject={setSidePanelSearchObjectFilter}
      />
    );
  }

  const isOnAskAiPage = sidePanelPage === SidePanelPages.AskAI;

  if (isMobile || !isOnAskAiPage) {
    return null;
  }

  return (
    <div {...stylex.props(styles.iconButtonContainer)}>
      <IconButton
        size="sm"
        variant="ghost"
        onClick={() => switchToNewChat()}
        aria-label={t`New conversation`}
      >
        <IconEdit />
      </IconButton>
    </div>
  );
};
