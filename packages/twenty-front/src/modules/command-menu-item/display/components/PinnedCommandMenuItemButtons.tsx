import { CommandMenuItemContainerType } from '@/command-menu-item/types/CommandMenuItemContainerType';
import { CommandMenuItemRenderer } from '@/command-menu-item/display/components/CommandMenuItemRenderer';
import { CommandMenuContext } from '@/command-menu-item/contexts/CommandMenuContext';
import { PinnedCommandMenuItemsInlineMeasurements } from '@/command-menu-item/display/components/PinnedCommandMenuItemsInlineMeasurements';
import { PINNED_COMMAND_MENU_ITEMS_GAP } from '@/command-menu-item/display/constants/PinnedCommandMenuItemsGap';
import { usePinnedCommandMenuItemsInlineLayout } from '@/command-menu-item/display/hooks/usePinnedCommandMenuItemsInlineLayout';
import { getLabelledPinnedCommandMenuItemId } from '@/command-menu-item/display/utils/getLabelledPinnedCommandMenuItemId';
import { NodeDimension } from '@/ui/utilities/dimensions/components/NodeDimension';
import { isDefined } from 'twenty-shared/utils';
import { motion } from 'framer-motion';
import { useContext, useMemo } from 'react';
import { useTheme } from 'twenty-ui/theme';
import { useIsMobile } from 'twenty-ui/utilities';
import {
  type CommandMenuItemFieldsFragment,
  EngineComponentKey,
} from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  wrapper: {
    flex: '1 1 0',
    minWidth: '0',
    overflow: 'hidden',
  },
  container: {
    display: 'flex',
    justifyContent: 'flex-end',
    minWidth: '0',
    width: '100%',
  },
  item: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  items: {
    display: 'flex',
    flexDirection: 'row',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
  itemsReversed: { flexDirection: 'row-reverse' },
  itemsGap: (gap: number) => ({ gap: `${gap}px` }),
});

export const PinnedCommandMenuItemButtons = ({
  containerWidth,
}: {
  // When set, the row shrinks to fit instead of stretching to measure free space, keeping sibling actions adjacent.
  containerWidth?: number;
}) => {
  const theme = useTheme();
  const { commandMenuItems, containerType } = useContext(CommandMenuContext);
  const isMobile = useIsMobile();

  const isSidePanelFooter =
    containerType === CommandMenuItemContainerType.SidePanelFooter;

  // Headers keep their title even on mobile, so their actions stay icon-only; only the footer has a full row for a label.
  const shouldLabelSingleCommandMenuItem = isSidePanelFooter;

  const pinnedCommandMenuItems = useMemo(
    () => commandMenuItems.filter((item) => item.isPinned === true),
    [commandMenuItems],
  );

  const labelledCommandMenuItemId = shouldLabelSingleCommandMenuItem
    ? getLabelledPinnedCommandMenuItemId(pinnedCommandMenuItems)
    : null;

  const shouldHideCommandMenuItemLabel = (commandMenuItemId: string) =>
    (isMobile && !isSidePanelFooter) ||
    (shouldLabelSingleCommandMenuItem &&
      commandMenuItemId !== labelledCommandMenuItemId);

  const {
    pinnedInlineCommandMenuItems,
    pinnedOverflowCommandMenuItems,
    shouldShowHotKeys,
    onContainerDimensionChange,
    onCommandMenuItemDimensionChange,
  } = usePinnedCommandMenuItemsInlineLayout({
    pinnedCommandMenuItems,
    layoutKey: isSidePanelFooter ? 'side-panel-footer' : 'page-header',
    containerWidth,
  });

  const isCommandMenuItemLabelled = (
    commandMenuItem: CommandMenuItemFieldsFragment,
  ) =>
    isDefined(commandMenuItem.shortLabel) &&
    !shouldHideCommandMenuItemLabel(commandMenuItem.id);

  // Labelled items last: rightmost in the footer, leftmost in the reversed header row.
  const displayedInlineCommandMenuItems = [
    ...pinnedInlineCommandMenuItems.filter(
      (item) => !isCommandMenuItemLabelled(item),
    ),
    ...pinnedInlineCommandMenuItems.filter(isCommandMenuItemLabelled),
  ];

  const inlineItemsRow = (
    <div
      {...stylex.props(
        styles.items,
        !isSidePanelFooter && styles.itemsReversed,
        styles.itemsGap(PINNED_COMMAND_MENU_ITEMS_GAP),
      )}
    >
      {displayedInlineCommandMenuItems.map((item) => (
        <motion.div
          {...stylex.props(styles.item)}
          key={item.id}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'unset', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{
            duration: theme.animation.duration.instant,
            ease: 'easeInOut',
          }}
        >
          <CommandMenuItemRenderer
            item={item}
            shouldHideLabel={shouldHideCommandMenuItemLabel(item.id)}
            shouldShowHotKey={shouldShowHotKeys}
            isPrimaryAction={
              item.engineComponentKey ===
                EngineComponentKey.CREATE_NEW_RECORD ||
              item.engineComponentKey === EngineComponentKey.COMPOSE_CAMPAIGN ||
              item.engineComponentKey ===
                EngineComponentKey.SEND_MESSAGE_CAMPAIGN
            }
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <>
      <PinnedCommandMenuItemsInlineMeasurements
        pinnedCommandMenuItems={[
          ...pinnedInlineCommandMenuItems,
          ...pinnedOverflowCommandMenuItems,
        ]}
        shouldHideCommandMenuItemLabel={shouldHideCommandMenuItemLabel}
        onPinnedCommandMenuItemDimensionChange={
          onCommandMenuItemDimensionChange
        }
      />
      {isDefined(containerWidth) ? (
        inlineItemsRow
      ) : (
        <div {...stylex.props(styles.wrapper)}>
          <NodeDimension onDimensionChange={onContainerDimensionChange}>
            <div {...stylex.props(styles.container)}>{inlineItemsRow}</div>
          </NodeDimension>
        </div>
      )}
    </>
  );
};
