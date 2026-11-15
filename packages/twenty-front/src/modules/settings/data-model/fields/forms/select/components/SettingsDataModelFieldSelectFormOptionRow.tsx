import { type FieldMetadataItemOption } from '@/object-metadata/types/FieldMetadataItem';
import { AdvancedSettingsWrapper } from '@/settings/components/AdvancedSettingsWrapper';
import { OPTION_VALUE_MAXIMUM_LENGTH } from '@/settings/data-model/constants/OptionValueMaximumLength';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown, type ColorLabels } from 'twenty-ui/components/navigation';
import {
  IconCheck,
  IconDotsVertical,
  IconGripVertical,
  IconTrash,
  IconX,
} from 'twenty-ui/icon';
import { ColorSample } from 'twenty-ui/primitives/data-display';
import { MAIN_COLOR_NAMES, useTheme } from 'twenty-ui/theme';

import { computeOptionValueFromLabel } from '@/object-metadata/utils/computeOptionValueFromLabel';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const useColorLabels = (): ColorLabels => ({
  gray: t`Gray`,
  tomato: t`Tomato`,
  red: t`Red`,
  ruby: t`Ruby`,
  crimson: t`Crimson`,
  pink: t`Pink`,
  plum: t`Plum`,
  purple: t`Purple`,
  violet: t`Violet`,
  iris: t`Iris`,
  cyan: t`Cyan`,
  turquoise: t`Turquoise`,
  sky: t`Sky`,
  blue: t`Blue`,
  jade: t`Jade`,
  green: t`Green`,
  grass: t`Grass`,
  mint: t`Mint`,
  lime: t`Lime`,
  bronze: t`Bronze`,
  gold: t`Gold`,
  brown: t`Brown`,
  orange: t`Orange`,
  amber: t`Amber`,
  yellow: t`Yellow`,
});

type SettingsDataModelFieldSelectFormOptionRowProps = {
  isDefault?: boolean;
  onChange: (value: FieldMetadataItemOption) => void;
  onRemove?: () => void;
  onSetAsDefault?: () => void;
  onRemoveAsDefault?: () => void;
  onInputEnter?: () => void;
  option: FieldMetadataItemOption;
  isNewRow?: boolean;
  fieldIsNullable?: boolean;
};

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    minHeight: spacing['--t-spacing-6'],
    paddingBottom: spacing['--t-spacing-1_5'],
    paddingTop: spacing['--t-spacing-1_5'],
  },
  optionInputContainer: {
    flexGrow: 1,
    width: '100%',
  },
  colorSampleContainer: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    marginBottom: spacing['--t-spacing-1'],
    marginLeft: '14px',
    marginRight: '14px',
    marginTop: spacing['--t-spacing-1'],
  },
  iconGripVerticalContainer: {
    alignItems: 'center',
    display: 'flex',
    marginRight: '3px',
  },
  lightIconButtonContainer: {
    alignItems: 'center',
    display: 'flex',
    marginLeft: spacing['--t-spacing-2'],
  },
});

export const SettingsDataModelFieldSelectFormOptionRow = ({
  isDefault,
  onChange,
  onRemove,
  onSetAsDefault,
  onRemoveAsDefault,
  onInputEnter,
  option,
  isNewRow,
  fieldIsNullable,
}: SettingsDataModelFieldSelectFormOptionRowProps) => {
  const theme = useTheme();
  const colorLabels = useColorLabels();
  const SELECT_COLOR_DROPDOWN_ID = `select-color-dropdown-${option.id}`;
  const SELECT_ACTIONS_DROPDOWN_ID = `select-actions-dropdown-${option.id}`;

  const shouldForbidRemoveAsDefault = isDefault && !fieldIsNullable;

  const handleInputEnter = () => {
    onInputEnter?.();
  };

  return (
    <div {...stylex.props(styles.row)}>
      <span {...stylex.props(styles.iconGripVerticalContainer)}>
        <IconGripVertical
          style={{
            minWidth: theme.icon.size.md,
          }}
          size={theme.icon.size.md}
          stroke={theme.icon.stroke.sm}
          color={theme.font.color.extraLight}
        />
      </span>
      <AdvancedSettingsWrapper animationDimension="width" hideDot>
        <div {...stylex.props(styles.optionInputContainer)}>
          <SettingsTextInput
            sizeVariant="sm"
            instanceId={`select-option-value-${option.id}`}
            value={option.value}
            onChange={(input) =>
              onChange({
                ...option,
                value: computeOptionValueFromLabel(input),
              })
            }
            RightIcon={isDefault ? IconCheck : undefined}
            maxLength={OPTION_VALUE_MAXIMUM_LENGTH}
          />
        </div>
      </AdvancedSettingsWrapper>
      <DropdownRoot dropdownId={SELECT_COLOR_DROPDOWN_ID} type="picker">
        <Dropdown.Trigger
          render={<span {...stylex.props(styles.colorSampleContainer)} />}
          nativeButton={false}
          aria-label={t`Color`}
        >
          <ColorSample colorName={option.color} />
        </Dropdown.Trigger>
        <DropdownContent align="start">
          <Dropdown.Section>
            {MAIN_COLOR_NAMES.map((colorName) => (
              <Dropdown.OptionItem
                key={colorName}
                selected={colorName === option.color}
                onSelect={() => onChange({ ...option, color: colorName })}
                startIcon={<ColorSample colorName={colorName} />}
              >
                {colorLabels[colorName]}
              </Dropdown.OptionItem>
            ))}
          </Dropdown.Section>
        </DropdownContent>
      </DropdownRoot>
      <div {...stylex.props(styles.optionInputContainer)}>
        <SettingsTextInput
          sizeVariant="sm"
          instanceId={`select-option-label-${option.id}`}
          value={option.label}
          onChange={(label) => {
            const optionNameHasBeenEdited = !(
              option.value === computeOptionValueFromLabel(option.label)
            );
            onChange({
              ...option,
              label,
              value: optionNameHasBeenEdited
                ? option.value
                : computeOptionValueFromLabel(label),
            });
          }}
          RightIcon={isDefault ? IconCheck : undefined}
          maxLength={OPTION_VALUE_MAXIMUM_LENGTH}
          onInputEnter={handleInputEnter}
          autoFocusOnMount={isNewRow}
          autoSelectOnMount={isNewRow}
        />
      </div>
      <DropdownRoot dropdownId={SELECT_ACTIONS_DROPDOWN_ID} type="menu">
        <span {...stylex.props(styles.lightIconButtonContainer)}>
          <Dropdown.Trigger
            disabled={shouldForbidRemoveAsDefault}
            render={
              <LightIconButton
                emphasis="subtle"
                disabled={shouldForbidRemoveAsDefault}
                aria-label={t`More options`}
              >
                <IconDotsVertical />
              </LightIconButton>
            }
          />
        </span>
        <DropdownContent side="right" align="start">
          <Dropdown.Section>
            {isDefault ? (
              <Dropdown.ActionItem
                startIcon={<IconX />}
                onClick={() => onRemoveAsDefault?.()}
              >{t`Remove as default`}</Dropdown.ActionItem>
            ) : (
              <Dropdown.ActionItem
                startIcon={<IconCheck />}
                onClick={() => onSetAsDefault?.()}
              >{t`Set as default`}</Dropdown.ActionItem>
            )}
            {isDefined(onRemove) && !isDefault && (
              <Dropdown.ActionItem
                color="danger"
                startIcon={<IconTrash />}
                onClick={() => onRemove()}
              >{t`Remove option`}</Dropdown.ActionItem>
            )}
          </Dropdown.Section>
        </DropdownContent>
      </DropdownRoot>
    </div>
  );
};
