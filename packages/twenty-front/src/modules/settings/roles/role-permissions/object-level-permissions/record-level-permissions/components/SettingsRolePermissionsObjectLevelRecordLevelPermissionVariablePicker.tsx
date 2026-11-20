/* @license Enterprise */

import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconVariablePlus } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { SettingsRolePermissionsObjectLevelRecordLevelPermissionMeValueSelect } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/components/SettingsRolePermissionsObjectLevelRecordLevelPermissionMeValueSelect';
import { RecordLevelPermissionVariablePickerContext } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/contexts/RecordLevelPermissionVariablePickerContext';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';

const styles = stylex.create({
  container: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
  readonly: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': 'transparent',
    },
  },
  multiline: {
    borderStyle: 'none',
    borderWidth: 0,
    paddingBlock: spacing['--t-spacing-0_5'],
    paddingInline: spacing['--t-spacing-0'],
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    color: fontColor['--t-font-color-primary'],
    cursor: 'default',
    position: 'absolute',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: 0,
    right: spacing['--t-spacing-0'],
    top: spacing['--t-spacing-0'],
  },
  multilineReadonly: {
    backgroundColor: { default: 'transparent', ':hover': 'transparent' },
  },
});

export const SettingsRolePermissionsObjectLevelRecordLevelPermissionVariablePicker: VariablePickerComponent =
  ({ instanceId, disabled, multiline }) => {
    const theme = useTheme();
    const pickerContext = useContext(
      RecordLevelPermissionVariablePickerContext,
    );

    if (!isDefined(pickerContext)) {
      return null;
    }

    const { recordFilterId, onSelect } = pickerContext;

    return (
      <DropdownRoot
        dropdownId={`record-level-permission-me-picker-${instanceId}-${recordFilterId}`}
        type="picker"
      >
        <Dropdown.Trigger
          render={
            <div
              {...stylex.props(
                styles.container,
                disabled && styles.readonly,
                multiline && styles.multiline,
                multiline && disabled && styles.multilineReadonly,
              )}
            />
          }
          nativeButton={false}
          disabled={disabled}
          aria-label={t`Select a current user field`}
        >
          <IconVariablePlus size={theme.icon.size.sm} />
        </Dropdown.Trigger>
        <DropdownContent
          side="bottom"
          align="end"
          width={GenericDropdownContentWidth.Medium}
        >
          <SettingsRolePermissionsObjectLevelRecordLevelPermissionMeValueSelect
            onSelect={onSelect}
            recordFilterId={recordFilterId}
          />
        </DropdownContent>
      </DropdownRoot>
    );
  };
