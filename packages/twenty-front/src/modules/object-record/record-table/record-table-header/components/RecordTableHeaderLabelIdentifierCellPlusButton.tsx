import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconPlus } from 'twenty-ui/icon';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  headerIcon: {
    marginTop: spacing['--t-spacing-1'],
    marginRight: spacing['--t-spacing-1'],
    marginBottom: spacing['--t-spacing-1'],
    marginLeft: spacing['--t-spacing-1_5'],
  },
});

export const RecordTableHeaderLabelIdentifierCellPlusButton = () => {
  const { objectMetadataItem, objectPermissions } =
    useRecordTableContextOrThrow();

  const isMobile = useIsMobile();
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });

  const handlePlusButtonClick = () => {
    createNewIndexRecord({
      position: 'first',
    });
  };

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  return (
    !isMobile &&
    !isLayoutCustomizationModeEnabled &&
    !hasAnySoftDeleteFilterOnView &&
    canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    }) && (
      <div {...stylex.props(styles.headerIcon)}>
        <LightIconButton
          size="sm"
          emphasis="subtle"
          onClick={handlePlusButtonClick}
          aria-label={t`Add field`}
        >
          <IconPlus />
        </LightIconButton>
      </div>
    )
  );
};
