import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useFullNameFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useFullNameFieldDisplay';
import { useRecordTitleCell } from '@/object-record/record-title-cell/hooks/useRecordTitleCell';
import { getRecordFieldInputInstanceId } from '@/object-record/utils/getRecordFieldInputId';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
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
    alignItems: 'center',
    background: {
      default: 'inherit',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderStyle: 'none',
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'flex',
    height: '24px',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: spacing['--t-spacing-0'],
    paddingRight: '5px',
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: '5px',
  },
  emptyText: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

export const RecordTitleFullNameFieldDisplay = ({
  containerType,
}: {
  containerType: string;
}) => {
  const { recordId, fieldDefinition } = useContext(FieldContext);

  const { openRecordTitleCell } = useRecordTitleCell();

  const { fieldValue } = useFullNameFieldDisplay();

  const content = [fieldValue?.firstName, fieldValue?.lastName]
    .filter(isNonEmptyString)
    .join(' ')
    .trim();

  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();

  const recordTitleCellId = getRecordFieldInputInstanceId({
    recordId,
    fieldName: fieldDefinition.metadata.fieldName,
    prefix: containerType,
  });

  return (
    <div
      onClick={() => {
        pushFocusItemToFocusStack({
          focusId: recordTitleCellId,
          component: {
            type: FocusComponentType.OPENED_FIELD_INPUT,
            instanceId: recordTitleCellId,
          },
          globalHotkeysConfig: {
            enableGlobalHotkeysConflictingWithKeyboard: false,
          },
        });

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
      {!content ? (
        <div {...stylex.props(styles.emptyText)}>{t`Untitled`}</div>
      ) : (
        <OverflowingTextWithTooltip
          text={isNonEmptyString(content) ? content : fieldDefinition.label}
        />
      )}
    </div>
  );
};
