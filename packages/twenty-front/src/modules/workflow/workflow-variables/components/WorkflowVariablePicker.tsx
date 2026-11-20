import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { WorkflowVariablesDropdown } from '@/workflow/workflow-variables/components/WorkflowVariablesDropdown';
import { SEARCH_VARIABLES_DROPDOWN_ID } from '@/workflow/workflow-variables/constants/SearchVariablesDropdownId';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    margin: 0,
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    display: 'flex',
    justifyContent: 'center',
    position: 'static',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: 0,
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
  rootReadonly: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
  },
  rootUnfolded: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-medium'],
    },
  },
  rootUnfoldedReadonly: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
  },
  rootMultiline: {
    margin: spacing['--t-spacing-1'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'none',
    backgroundColor: { default: 'transparent', ':hover': 'transparent' },
    position: 'absolute',
    height: spacing['--t-spacing-7'],
    right: spacing['--t-spacing-0'],
    top: spacing['--t-spacing-0'],
    width: spacing['--t-spacing-7'],
  },
  rootMultilineUnfolded: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-medium'],
    },
  },
});

export const WorkflowVariablePicker: VariablePickerComponent = ({
  instanceId,
  disabled,
  multiline,
  onVariableSelect,
  shouldDisplayRecordObjects = false,
  shouldDisplayRecordFields = true,
  objectNameSingularsToSelect,
}) => {
  const dropdownId = `${SEARCH_VARIABLES_DROPDOWN_ID}-${instanceId}`;
  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );

  return (
    <div
      {...stylex.props(
        styles.root,
        disabled === true && styles.rootReadonly,
        isDropdownOpen && styles.rootUnfolded,
        isDropdownOpen && disabled === true && styles.rootUnfoldedReadonly,
        multiline && styles.rootMultiline,
        multiline && isDropdownOpen && styles.rootMultilineUnfolded,
      )}
    >
      <WorkflowVariablesDropdown
        instanceId={instanceId}
        onVariableSelect={onVariableSelect}
        disabled={disabled}
        shouldDisplayRecordObjects={shouldDisplayRecordObjects}
        shouldDisplayRecordFields={shouldDisplayRecordFields}
        objectNameSingularsToSelect={objectNameSingularsToSelect}
      />
    </div>
  );
};
