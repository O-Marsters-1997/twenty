import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { RecordBoardColumnContext } from '@/object-record/record-board/record-board-column/contexts/RecordBoardColumnContext';
import { isRecordBoardCellsNonEditableComponentState } from '@/object-record/record-board/states/isRecordBoardCellsNonEditableComponentState';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { getFieldMetadataItemGqlFieldName } from '@/object-metadata/utils/getFieldMetadataItemGqlFieldName';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { t } from '@lingui/core/macro';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  newButton: {
    alignItems: 'center',
    alignSelf: 'baseline',
    backgroundColor: {
      default: background['--t-background-primary'],
      ':hover': background['--t-background-tertiary'],
    },
    borderStyle: 'none',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
});

export const RecordBoardColumnNewRecordButton = () => {
  const theme = useTheme();
  const { objectMetadataItem, selectFieldMetadataItem } =
    useContext(RecordBoardContext);

  const { columnDefinition } = useContext(RecordBoardColumnContext);

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  const isRecordBoardCellsNonEditable = useAtomComponentStateValue(
    isRecordBoardCellsNonEditableComponentState,
  );

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem: objectMetadataItem,
  });

  // Creating through a nested relation or junction needs a record picker only the table layout offers.
  const recordTableWidgetContext = useContext(RecordTableWidgetContext);

  if (
    isDefined(recordTableWidgetContext?.nestedRelationCreateThrough) ||
    isDefined(recordTableWidgetContext?.junctionCreateThrough)
  ) {
    return null;
  }

  if (isRecordBoardCellsNonEditable) {
    return null;
  }

  if (
    !canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    })
  ) {
    return null;
  }

  if (hasAnySoftDeleteFilterOnView) {
    return null;
  }

  return (
    <button
      onClick={async () => {
        await createNewIndexRecord({
          position: 'last',
          [getFieldMetadataItemGqlFieldName(selectFieldMetadataItem)]:
            columnDefinition.value,
        });
      }}
      {...stylex.props(styles.newButton)}
    >
      <IconPlus size={theme.icon.size.md} />
      {t`New`}
    </button>
  );
};
