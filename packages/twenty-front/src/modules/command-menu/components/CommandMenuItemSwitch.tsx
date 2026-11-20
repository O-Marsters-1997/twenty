import * as stylex from '@stylexjs/stylex';
import { isSelectedItemIdComponentFamilyState } from '@/ui/layout/selectable-list/states/isSelectedItemIdComponentFamilyState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { isDefined } from 'twenty-shared/utils';
import { SettingsRow } from 'twenty-ui/components/settings';
import { type IconComponent } from 'twenty-ui/icon';
import { type SwitchProps } from 'twenty-ui/primitives/input';
import {
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type CommandMenuItemSwitchProps = {
  id: string;
  LeftIcon?: IconComponent;
  text: string;
  checked: boolean;
  onCheckedChange?: SwitchProps['onCheckedChange'];
  size?: SwitchProps['size'];
  disabled?: boolean;
  className?: string;
};

const styles = stylex.create({
  iconContainer: {
    padding: spacing['--t-spacing-1'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    display: 'flex',
  },
});

export const CommandMenuItemSwitch = ({
  id,
  LeftIcon,
  text,
  checked,
  onCheckedChange,
  size = 'md',
  disabled = false,
  className,
}: CommandMenuItemSwitchProps) => {
  const isSelectedItemId = useAtomComponentFamilyStateValue(
    isSelectedItemIdComponentFamilyState,
    id,
  );

  return (
    <SettingsRow
      labelRender={<label className={className} />}
      focused={isSelectedItemId}
      startElement={
        isDefined(LeftIcon) && (
          <span {...stylex.props(styles.iconContainer)}>
            <LeftIcon />
          </span>
        )
      }
      disabled={disabled}
      checked={checked}
      onCheckedChange={onCheckedChange}
      size={size}
    >
      {text}
    </SettingsRow>
  );
};
