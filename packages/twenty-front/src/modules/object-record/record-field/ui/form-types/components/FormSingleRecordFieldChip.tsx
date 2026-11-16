import { RecordChip } from '@/object-record/components/RecordChip';
import { FormFieldPlaceholder } from '@/object-record/record-field/ui/form-types/components/FormFieldPlaceholder';
import {
  type RecordId,
  type Variable,
} from '@/object-record/record-field/ui/form-types/types/RecordPickerValue';
import { VariableChipStandalone } from '@/object-record/record-field/ui/form-types/components/VariableChipStandalone';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { isStandaloneVariableString } from 'twenty-shared/workflow';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconForbid } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  recordChipContainer: {
    marginTop: spacing['--t-spacing-2'],
    marginRight: spacing['--t-spacing-2'],
    marginBottom: spacing['--t-spacing-2'],
    marginLeft: spacing['--t-spacing-2'],
  },
  placeholderContainer: {
    marginTop: spacing['--t-spacing-2'],
    marginRight: spacing['--t-spacing-2'],
    marginBottom: spacing['--t-spacing-2'],
    marginLeft: spacing['--t-spacing-2'],
  },
  noRecordContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    marginTop: spacing['--t-spacing-2'],
    marginRight: spacing['--t-spacing-2'],
    marginBottom: spacing['--t-spacing-2'],
    marginLeft: spacing['--t-spacing-2'],
  },
});

type FormSingleRecordFieldChipProps = {
  draftValue:
    | {
        type: 'static';
        value: RecordId;
      }
    | {
        type: 'variable';
        value: Variable;
      }
    | {
        type: 'no-record';
        value: null;
      };
  selectedRecord?: ObjectRecord;
  objectNameSingular: string;
  onRemove: (event?: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
};

export const FormSingleRecordFieldChip = ({
  draftValue,
  selectedRecord,
  objectNameSingular,
  onRemove,
  disabled,
}: FormSingleRecordFieldChipProps) => {
  if (
    draftValue.type === 'variable' &&
    isStandaloneVariableString(draftValue.value)
  ) {
    return (
      <VariableChipStandalone
        rawVariableName={draftValue.value}
        onRemove={disabled ? undefined : onRemove}
        isFullRecord
      />
    );
  }

  if (draftValue.type === 'no-record') {
    return (
      <div {...stylex.props(styles.noRecordContainer)}>
        <IconForbid size={12} />
        {t`No record`}
      </div>
    );
  }

  if (draftValue.type === 'static' && isDefined(selectedRecord)) {
    return (
      <div {...stylex.props(styles.recordChipContainer)}>
        <RecordChip
          record={selectedRecord}
          objectNameSingular={objectNameSingular}
        />
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.placeholderContainer)}>
      <FormFieldPlaceholder>{t`Select`}</FormFieldPlaceholder>
    </div>
  );
};
