import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { COMMAND_MENU_DROPDOWN_CLICK_OUTSIDE_ID } from '@/command-menu-item/constants/CommandMenuDropdownClickOutsideId';
import { useSelectFirstRecordForEditMode } from '@/command-menu-item/edit/hooks/useSelectFirstRecordForEditMode';
import { MAIN_CONTEXT_STORE_INSTANCE_ID } from '@/context-store/constants/MainContextStoreInstanceId';
import { mainContextStoreHasSelectedRecordsSelector } from '@/context-store/states/selectors/mainContextStoreHasSelectedRecordsSelector';
import { useResetRecordIndexSelection } from '@/object-record/record-index/hooks/useResetRecordIndexSelection';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { Dropdown } from 'twenty-ui/components/navigation';
import { IconChevronDown, IconSquareCheck, IconSquareX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const DROPDOWN_ID = 'command-menu-edit-record-selection-dropdown';

const styles = stylex.create({
  label: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  clickableArea: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    cursor: 'pointer',
    display: 'flex',
    height: '24px',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-1'],
  },
  clickableAreaDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
});

type CommandMenuItemEditRecordSelectionDropdownProps = {
  isRecordPage?: boolean;
};

export const CommandMenuItemEditRecordSelectionDropdown = ({
  isRecordPage = false,
}: CommandMenuItemEditRecordSelectionDropdownProps) => {
  const { t } = useLingui();
  const theme = useTheme();

  const mainContextStoreHasSelectedRecords = useAtomStateValue(
    mainContextStoreHasSelectedRecordsSelector,
  );

  const { selectFirstRecordForEditMode } = useSelectFirstRecordForEditMode();
  const { resetRecordIndexSelection } = useResetRecordIndexSelection(
    MAIN_CONTEXT_STORE_INSTANCE_ID,
  );

  const isNoneSelected = !mainContextStoreHasSelectedRecords;

  const handleSelectRecords = () => {
    if (isNoneSelected) {
      selectFirstRecordForEditMode();
    }
  };

  const TriggerIcon = isNoneSelected ? IconSquareX : IconSquareCheck;
  const triggerLabel = isNoneSelected
    ? t`No record selected`
    : t`Records selected`;

  return (
    <DropdownRoot dropdownId={DROPDOWN_ID} type="picker">
      <Dropdown.Trigger
        render={
          <div
            {...stylex.props(
              styles.clickableArea,
              isRecordPage && styles.clickableAreaDisabled,
            )}
            data-click-outside-id={COMMAND_MENU_DROPDOWN_CLICK_OUTSIDE_ID}
          />
        }
        nativeButton={false}
        disabled={isRecordPage}
      >
        <TriggerIcon
          size={16}
          color={theme.font.color.primary}
          stroke={theme.icon.stroke.sm}
        />
        <span {...stylex.props(styles.label)}>{triggerLabel}</span>
        <IconChevronDown
          size={16}
          color={theme.font.color.primary}
          stroke={theme.icon.stroke.sm}
        />
      </Dropdown.Trigger>
      <DropdownContent sideOffset={4} aria-label={t`Record selection`}>
        <Dropdown.Section
          data-click-outside-id={COMMAND_MENU_DROPDOWN_CLICK_OUTSIDE_ID}
        >
          <Dropdown.OptionItem
            selected={isNoneSelected}
            onSelect={resetRecordIndexSelection}
            startIcon={<SelectOptionIcon Icon={IconSquareX} />}
          >
            {t`No record selected`}
          </Dropdown.OptionItem>
          <Dropdown.OptionItem
            selected={!isNoneSelected}
            onSelect={handleSelectRecords}
            startIcon={<SelectOptionIcon Icon={IconSquareCheck} />}
          >
            {t`Records selected`}
          </Dropdown.OptionItem>
        </Dropdown.Section>
      </DropdownContent>
    </DropdownRoot>
  );
};
