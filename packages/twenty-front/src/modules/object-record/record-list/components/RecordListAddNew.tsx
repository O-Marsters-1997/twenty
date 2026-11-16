import { getFieldMetadataItemGqlFieldName } from '@/object-metadata/utils/getFieldMetadataItemGqlFieldName';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { useCurrentRecordGroupDefinition } from '@/object-record/record-group/hooks/useCurrentRecordGroupDefinition';
import { recordIndexGroupFieldMetadataItemComponentState } from '@/object-record/record-index/states/recordIndexGroupFieldMetadataComponentState';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { IconPlus } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { logError } from '~/utils/logError';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  addNewRow: {
    alignItems: 'center',
    background: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    borderStyle: 'none',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    gap: spacing['--t-spacing-1'],
    height: '24px',
    paddingTop: '0',
    paddingRight: '6px',
    paddingBottom: '0',
    paddingLeft: '6px',
    textAlign: 'left',
  },
});

export const RecordListAddNew = () => {
  const theme = useTheme();
  const { objectMetadataItem } = useRecordIndexContextOrThrow();
  const { enqueueToast } = useToast();

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });

  const currentRecordGroupDefinition = useCurrentRecordGroupDefinition();

  const recordIndexGroupFieldMetadataItem = useAtomComponentStateValue(
    recordIndexGroupFieldMetadataItemComponentState,
  );

  const groupFieldMetadataItem = objectMetadataItem.fields.find(
    (field) => field.id === recordIndexGroupFieldMetadataItem?.id,
  );

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  if (hasAnySoftDeleteFilterOnView) {
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

  const handleCreateRecord = async () => {
    try {
      const groupFieldValues =
        isDefined(currentRecordGroupDefinition) &&
        isDefined(groupFieldMetadataItem)
          ? {
              [getFieldMetadataItemGqlFieldName(groupFieldMetadataItem)]:
                currentRecordGroupDefinition.value,
            }
          : {};

      await createNewIndexRecord({
        position: 'last',
        ...groupFieldValues,
      });
    } catch (error) {
      logError(error);
      enqueueToast({ status: 'error', children: t`Failed to create record` });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCreateRecord}
      {...stylex.props(styles.addNewRow)}
    >
      <IconPlus
        stroke={theme.icon.stroke.sm}
        size={theme.icon.size.sm}
        color={theme.font.color.tertiary}
      />
      {t`Add new`}
    </button>
  );
};
