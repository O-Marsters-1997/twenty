import { SidePanelDefaultSelectionEffect } from '@/side-panel/components/SidePanelDefaultSelectionEffect';
import { SIDE_PANEL_SELECTABLE_LIST_ID } from '@/side-panel/constants/SidePanelSelectableListId';
import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { hasUserSelectedSidePanelListItemState } from '@/side-panel/states/hasUserSelectedSidePanelListItemState';
import { SelectableList } from '@/ui/layout/selectable-list/components/SelectableList';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

type SidePanelListProps = {
  selectableItemIds: string[];
  children: React.ReactNode;
  loading?: boolean;
  noResults?: boolean;
  noResultsText?: string;
};

const styles = stylex.create({
  innerList: {
    paddingInline: spacing['--t-spacing-2'],
    maxHeight: {
      default: 'calc(calc(100dvh / var(--t-zoom, 1)) - 52px)',
      [media.mobile]: 'calc(calc(100dvh / var(--t-zoom, 1)) - 56px)',
    },
    paddingTop: spacing['--t-spacing-2'],
    width: '100%',
  },
  empty: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    justifyContent: 'center',
    whiteSpace: 'pre-wrap',
    height: '64px',
  },
});

export const SidePanelList = ({
  selectableItemIds,
  children,
  loading = false,
  noResults = false,
  noResultsText,
}: SidePanelListProps) => {
  const setHasUserSelectedSidePanelListItem = useSetAtomState(
    hasUserSelectedSidePanelListItemState,
  );

  return (
    <>
      <SidePanelDefaultSelectionEffect selectableItemIds={selectableItemIds} />
      <ScrollWrapper componentInstanceId={`scroll-wrapper-side-panel`}>
        <div {...stylex.props(styles.innerList)}>
          <SelectableList
            selectableListInstanceId={SIDE_PANEL_SELECTABLE_LIST_ID}
            focusId={SIDE_PANEL_FOCUS_ID}
            selectableItemIdArray={selectableItemIds}
            onSelect={() => {
              setHasUserSelectedSidePanelListItem(true);
            }}
          >
            {children}
            {noResults && !loading && (
              <div {...stylex.props(styles.empty)}>
                {noResultsText ?? t`No results found`}
              </div>
            )}
          </SelectableList>
        </div>
      </ScrollWrapper>
    </>
  );
};
