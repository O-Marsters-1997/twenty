import * as stylex from '@stylexjs/stylex';
import { CommandMenuContext } from '@/command-menu-item/contexts/CommandMenuContext';
import { PINNED_COMMAND_MENU_ITEMS_GAP } from '@/command-menu-item/display/constants/PinnedCommandMenuItemsGap';
import { getCommandMenuItemButtonHotKey } from '@/command-menu-item/display/utils/getCommandMenuItemButtonHotKey';
import { getPinnedCommandMenuItemWidthKey } from '@/command-menu-item/display/utils/getPinnedCommandMenuItemWidthKey';
import { interpolateCommandMenuItemFields } from '@/command-menu-item/display/utils/interpolateCommandMenuItemFields';
import { CommandMenuButton } from '@/command-menu/components/CommandMenuButton';
import { NodeDimension } from '@/ui/utilities/dimensions/components/NodeDimension';
import { COMMAND_MENU_DEFAULT_ICON } from '@/workflow/workflow-trigger/constants/CommandMenuDefaultIcon';
import { Fragment, useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useIcons } from 'twenty-ui/icon';
import { type CommandMenuItemFieldsFragment } from '~/generated-metadata/graphql';

type ElementDimensions = {
  width: number;
  height: number;
};

type PinnedCommandMenuItemsInlineMeasurementsProps = {
  pinnedCommandMenuItems: CommandMenuItemFieldsFragment[];
  shouldHideCommandMenuItemLabel: (commandMenuItemId: string) => boolean;
  onPinnedCommandMenuItemDimensionChange: (
    commandMenuItemKey: string,
  ) => (dimensions: ElementDimensions) => void;
};

const styles = stylex.create({
  hiddenMeasurements: {
    display: 'flex',
    pointerEvents: 'none',
    position: 'absolute',
    top: '-9999px',
    visibility: 'hidden',
  },
  gap: (gap: number) => ({ gap: `${gap}px` }),
});

export const PinnedCommandMenuItemsInlineMeasurements = ({
  pinnedCommandMenuItems,
  shouldHideCommandMenuItemLabel,
  onPinnedCommandMenuItemDimensionChange,
}: PinnedCommandMenuItemsInlineMeasurementsProps) => {
  const { getIcon } = useIcons();
  const { commandMenuContextApi } = useContext(CommandMenuContext);

  return (
    <div
      {...stylex.props(
        styles.hiddenMeasurements,
        styles.gap(PINNED_COMMAND_MENU_ITEMS_GAP),
      )}
    >
      {pinnedCommandMenuItems.map((item) => {
        const { iconKey, label, shortLabel } = interpolateCommandMenuItemFields(
          item,
          commandMenuContextApi,
        );

        const Icon = getIcon(iconKey, COMMAND_MENU_DEFAULT_ICON);
        const hotKey = getCommandMenuItemButtonHotKey(item);

        const renderMeasurement = (shouldShowHotKey: boolean) => {
          const widthKey = getPinnedCommandMenuItemWidthKey({
            commandMenuItemId: item.id,
            shouldShowHotKey,
          });

          return (
            <NodeDimension
              onDimensionChange={onPinnedCommandMenuItemDimensionChange(
                widthKey,
              )}
            >
              <CommandMenuButton
                command={{
                  key: `${widthKey}-inline-measurement`,
                  label,
                  shortLabel,
                  Icon,
                }}
                hotKey={shouldShowHotKey ? hotKey : undefined}
                shouldHideLabel={shouldHideCommandMenuItemLabel(item.id)}
              />
            </NodeDimension>
          );
        };

        return (
          <Fragment key={item.id}>
            {renderMeasurement(true)}
            {isDefined(hotKey) && renderMeasurement(false)}
          </Fragment>
        );
      })}
    </div>
  );
};
