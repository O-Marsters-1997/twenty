import { SelectOptionIcon } from '@/ui/input/components/SelectOptionIcon';
import { useTurnIntoBlockOptions } from '@/advanced-text-editor/hooks/useTurnIntoBlockOptions';
import { Dropdown } from 'twenty-ui/components/navigation';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { type Editor } from '@tiptap/react';
import { useId } from 'react';
import { IconPilcrow } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import {
  backgroundTransparent,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  menuItem: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-medium'],
    },
    borderStyle: 'none',
    borderRadius: spacing['--t-spacing-1_5'],
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-6'],
    outline: {
      default: null,
      ':focus': 'none',
    },
    paddingBlock: 0,
    paddingInline: 0,
    width: '100%',
  },
});

type TurnIntoBlockDropdownProps = {
  editor: Editor;
};

export const TurnIntoBlockDropdown = ({
  editor,
}: TurnIntoBlockDropdownProps) => {
  const theme = useTheme();
  const instanceId = useId();
  const dropdownId = `turn-into-block-dropdown-${instanceId}`;

  const options = useTurnIntoBlockOptions(editor);
  const activeItem = options.find((option) => option.isActive());
  const { icon: ActiveIcon = IconPilcrow, title: activeTitle = t`Paragraph` } =
    activeItem ?? {};

  return (
    <DropdownRoot dropdownId={dropdownId} type="picker">
      <Dropdown.Trigger
        render={
          <button {...stylex.props(styles.menuItem)}>
            <ActiveIcon size={theme.icon.size.md} />
            {activeTitle}
          </button>
        }
      />
      <DropdownContent
        align="end"
        sideOffset={parseInt(theme.spacing[1], 10)}
        finalFocus={() => editor.view.dom}
        aria-label={t`Turn into`}
      >
        <Dropdown.Section>
          {options.map(({ id, title, icon, onClick, isActive }) => (
            <Dropdown.OptionItem
              key={id}
              selected={isActive()}
              startIcon={<SelectOptionIcon Icon={icon} />}
              onSelect={onClick}
            >
              {title}
            </Dropdown.OptionItem>
          ))}
        </Dropdown.Section>
      </DropdownContent>
    </DropdownRoot>
  );
};
