import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { useRecordTitleCell } from '@/object-record/record-title-cell/hooks/useRecordTitleCell';
import { type RecordTitleCellContainerType } from '@/object-record/record-title-cell/types/RecordTitleCellContainerType';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useContext } from 'react';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  div: {
    background: {
      default: 'inherit',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderStyle: 'none',
    overflow: 'hidden',
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    height: '24px',
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: '5px',
    paddingRight: '5px',
    paddingTop: spacing['--t-spacing-0'],
  },
  emptyText: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

export const RecordTitleCellSingleTextDisplayMode = ({
  containerType,
}: {
  containerType: RecordTitleCellContainerType;
}) => {
  const { recordId, fieldDefinition } = useContext(FieldContext);

  const recordStore = useAtomFamilyStateValue(recordStoreFamilyState, recordId);

  const fieldValue = recordStore?.[fieldDefinition.metadata.fieldName];
  const isEmpty = !isNonEmptyString(fieldValue) || fieldValue.trim() === '';

  const { openRecordTitleCell } = useRecordTitleCell();

  return (
    <div
      onClick={() => {
        openRecordTitleCell({
          recordId,
          fieldMetadataItemId: fieldDefinition.fieldMetadataId,
          instanceId: getRecordFieldInputInstanceId({
            recordId,
            fieldName: fieldDefinition.metadata.fieldName,
            prefix: containerType,
          }),
        });
      }}
      {...stylex.props(styles.div)}
    >
      {isEmpty ? (
        <div {...stylex.props(styles.emptyText)}>{t`Untitled`}</div>
      ) : (
        <OverflowingTextWithTooltip text={fieldValue} />
      )}
    </div>
  );
};
