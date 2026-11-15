import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { getFieldPermissions } from '@/object-metadata/utils/getFieldPermissions';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { useRecordCalendarContextOrThrow } from '@/object-record/record-calendar/contexts/RecordCalendarContext';
import { isRecordCalendarReadOnlyComponentState } from '@/object-record/record-calendar/states/isRecordCalendarReadOnlyComponentState';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { recordIndexCalendarFieldMetadataIdComponentState } from '@/object-record/record-index/states/recordIndexCalendarFieldMetadataIdComponentState';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { t } from '@lingui/core/macro';
import { useContext } from 'react';
import { type Temporal } from 'temporal-polyfill';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  buttonContainer: {
    height: 'auto',
    minWidth: 'unset',
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-0_5'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-0_5'],
  },
});

type RecordCalendarAddNewProps = {
  cardDate: Temporal.PlainDate;
};

export const RecordCalendarAddNew = ({
  cardDate,
}: RecordCalendarAddNewProps) => {
  const isRecordCalendarReadOnly = useAtomComponentStateValue(
    isRecordCalendarReadOnlyComponentState,
  );

  const theme = useTheme();
  const { userTimezone } = useUserTimezone();
  const { objectMetadataItem } = useRecordCalendarContextOrThrow();
  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  const recordIndexCalendarFieldMetadataId = useAtomComponentStateValue(
    recordIndexCalendarFieldMetadataIdComponentState,
  );

  const calendarFieldMetadataItem = objectMetadataItem.fields.find(
    (field) => field.id === recordIndexCalendarFieldMetadataId,
  );

  const isCalendarFieldReadOnly = calendarFieldMetadataItem
    ? calendarFieldMetadataItem.isUIEditable === false ||
      !getFieldPermissions({
        objectPermissions,
        fieldMetadataId: calendarFieldMetadataItem.id,
      }).canUpdateField
    : false;

  // Creating through a nested relation or junction needs a record picker only the table layout offers.
  const recordTableWidgetContext = useContext(RecordTableWidgetContext);

  if (
    isDefined(recordTableWidgetContext?.nestedRelationCreateThrough) ||
    isDefined(recordTableWidgetContext?.junctionCreateThrough) ||
    isRecordCalendarReadOnly ||
    hasAnySoftDeleteFilterOnView === true ||
    !canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    }) ||
    calendarFieldMetadataItem === undefined ||
    isCalendarFieldReadOnly === true
  ) {
    return null;
  }

  return (
    <div {...stylex.props(styles.buttonContainer)}>
      <Button
        aria-label={t`Create record`}
        onClick={async (event) => {
          event.stopPropagation();

          const startDateTime = cardDate.toZonedDateTime({
            timeZone: userTimezone,
          });
          const startValue =
            calendarFieldMetadataItem.type === FieldMetadataType.DATE
              ? cardDate.toString()
              : startDateTime.toInstant().toString();

          await createNewIndexRecord({
            [calendarFieldMetadataItem.name]: startValue,
          });
        }}
        size="md"
        type="button"
        startIcon={<IconPlus size={theme.icon.size.sm} />}
        variant="ghost"
      />
    </div>
  );
};
