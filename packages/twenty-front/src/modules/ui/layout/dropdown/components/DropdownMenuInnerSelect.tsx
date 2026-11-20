import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconChevronDown } from 'twenty-ui/icon';
import { type SelectOption } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dropdownMenuInnerSelectDropdownButton: {
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'space-between',
    height: spacing['--t-spacing-7'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    width: '100%',
  },
});

type DropdownMenuInnerSelectProps = {
  selectedOption: SelectOption;
  onChange: (value: SelectOption) => void;
  options: SelectOption[];
  dropdownId: string;
  widthInPixels?: number;
  'aria-label': string;
};

export const DropdownMenuInnerSelect = ({
  selectedOption,
  onChange,
  options,
  dropdownId,
  widthInPixels,
  'aria-label': ariaLabel,
}: DropdownMenuInnerSelectProps) => {
  const theme = useTheme();

  return (
    <DropdownRoot
      dropdownId={dropdownId}
      type="picker"
      globalHotkeysConfig={{
        enableGlobalHotkeysWithModifiers: false,
        enableGlobalHotkeysConflictingWithKeyboard: false,
      }}
    >
      <Dropdown.Trigger render={<div />} nativeButton={false}>
        <div {...stylex.props(styles.dropdownMenuInnerSelectDropdownButton)}>
          <span>{selectedOption.label}</span>
          <IconChevronDown size={theme.icon.size.sm} />
        </div>
      </Dropdown.Trigger>
      <DropdownContent
        width={widthInPixels}
        side="bottom"
        align="end"
        alignOffset={-8}
        aria-label={ariaLabel}
      >
        <Dropdown.Section>
          {options.map((selectOption) => (
            <Dropdown.OptionItem
              key={`dropdown-menu-inner-select-item-${selectOption.value}`}
              onSelect={() => onChange(selectOption)}
              disabled={selectOption.disabled}
              selected={selectOption.value === selectedOption.value}
            >
              {selectOption.label}
            </Dropdown.OptionItem>
          ))}
        </Dropdown.Section>
      </DropdownContent>
    </DropdownRoot>
  );
};
