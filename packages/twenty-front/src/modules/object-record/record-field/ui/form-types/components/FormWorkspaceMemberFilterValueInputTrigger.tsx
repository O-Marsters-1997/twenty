import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconUserCircle } from 'twenty-ui/icon';

import { FormFieldPlaceholder } from '@/object-record/record-field/ui/form-types/components/FormFieldPlaceholder';
import { VariableChipStandalone } from '@/object-record/record-field/ui/form-types/components/VariableChipStandalone';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  triggerLabel: {
    flex: '1',
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: spacing['--t-spacing-2'],
    marginLeft: spacing['--t-spacing-2'],
    marginRight: spacing['--t-spacing-2'],
    marginTop: spacing['--t-spacing-2'],
  },
  placeholderContainer: {
    marginBottom: spacing['--t-spacing-2'],
    marginLeft: spacing['--t-spacing-2'],
    marginRight: spacing['--t-spacing-2'],
    marginTop: spacing['--t-spacing-2'],
  },
});

type FormWorkspaceMemberFilterValueInputTriggerProps = {
  isVariableValue: boolean;
  defaultValue?: string | null;
  isCurrentWorkspaceMemberSelected: boolean;
  triggerDisplayText: string | null;
  readonly?: boolean;
  onUnlinkVariable: () => void;
};

export const FormWorkspaceMemberFilterValueInputTrigger = ({
  isVariableValue,
  defaultValue,
  isCurrentWorkspaceMemberSelected,
  triggerDisplayText,
  readonly,
  onUnlinkVariable,
}: FormWorkspaceMemberFilterValueInputTriggerProps) => {
  if (isVariableValue) {
    return (
      <VariableChipStandalone
        rawVariableName={defaultValue ?? ''}
        onRemove={readonly ? undefined : onUnlinkVariable}
        isFullRecord
      />
    );
  }

  if (isDefined(triggerDisplayText)) {
    return (
      <div {...stylex.props(styles.triggerLabel)}>
        {isCurrentWorkspaceMemberSelected && <IconUserCircle size={12} />}
        {triggerDisplayText}
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.placeholderContainer)}>
      <FormFieldPlaceholder>{t`Select`}</FormFieldPlaceholder>
    </div>
  );
};
