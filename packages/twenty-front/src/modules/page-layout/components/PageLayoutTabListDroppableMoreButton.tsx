import { pointerIntersection } from '@dnd-kit/collision';
import { useDroppable } from '@dnd-kit/react';

import { PAGE_LAYOUT_TAB_LIST_DROPPABLE_IDS } from '@/page-layout/components/PageLayoutTabListDroppableIds';
import { PAGE_LAYOUT_TAB_DND_TYPE } from '@/page-layout/constants/PageLayoutTabDndType';
import { type PageLayoutTabMoreButtonDropData } from '@/page-layout/types/PageLayoutTabMoreButtonDropData';
import { TabMoreButton } from '@/ui/layout/tab-list/components/TabMoreButton';
import { backgroundTransparent } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type PageLayoutTabListDroppableMoreButtonProps = {
  hiddenTabsCount: number;
  isActiveTabHidden: boolean;
};

export const PageLayoutTabListDroppableMoreButton = ({
  hiddenTabsCount,
  isActiveTabHidden,
}: PageLayoutTabListDroppableMoreButtonProps) => {
  const moreButtonDropData: PageLayoutTabMoreButtonDropData = {
    type: 'tab-more-button',
  };

  const { ref, isDropTarget } = useDroppable({
    id: PAGE_LAYOUT_TAB_LIST_DROPPABLE_IDS.MORE_BUTTON,
    accept: PAGE_LAYOUT_TAB_DND_TYPE,
    collisionDetector: pointerIntersection,
    data: moreButtonDropData,
  });

  return (
    <div ref={ref}>
      <div {...stylex.props(isDropTarget && styles.draggingOver)}>
        <TabMoreButton
          hiddenTabsCount={hiddenTabsCount}
          active={isActiveTabHidden}
          isDropdownTrigger
        />
      </div>
    </div>
  );
};

const styles = stylex.create({
  draggingOver: {
    backgroundColor: backgroundTransparent['--t-background-transparent-blue'],
    pointerEvents: 'none',
  },
});
