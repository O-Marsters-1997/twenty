import { AnimatedRotate } from '@/settings/roles/role-permissions/object-level-permissions/object-form/components/internal/AnimatedRotate/AnimatedRotate';
import { IconReload, IconX } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { iconSize } from 'twenty-ui/theme/tokens.stylex';

export type OverridableCheckboxType = 'default' | 'override' | 'no_cta';

const styles = stylex.create({
  overridableCheckboxContainer: {
    alignItems: 'center',
    display: 'inline-flex',
    justifyContent: 'flex-start',
    width: `calc(${iconSize['--t-icon-size-xl']} * 2 * 1px)`,
  },
  overridableCheckboxContainerItem: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: `calc(${iconSize['--t-icon-size-xl']} * 1px)`,
    width: `calc(${iconSize['--t-icon-size-xl']} * 1px)`,
  },
  iconWrapper: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  iconWrapperDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
});

export type OverridableCheckboxProps = {
  type?: OverridableCheckboxType;
  onChange: () => void;
  checked: boolean;
  disabled: boolean;
};

export const OverridableCheckbox = ({
  type = 'default',
  onChange,
  checked,
  disabled,
}: OverridableCheckboxProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.overridableCheckboxContainer)}>
      {type === 'default' && (
        <>
          <div {...stylex.props(styles.overridableCheckboxContainerItem)}>
            <Checkbox checked={true} disabled={true} />
          </div>
          <div {...stylex.props(styles.overridableCheckboxContainerItem)}>
            <div
              {...stylex.props(
                styles.iconWrapper,
                disabled && styles.iconWrapperDisabled,
              )}
              onClick={disabled ? undefined : onChange}
            >
              {!disabled && (
                <AnimatedRotate>
                  <IconX
                    size={theme.icon.size.md}
                    color={theme.font.color.secondary}
                  />
                </AnimatedRotate>
              )}
            </div>
          </div>
        </>
      )}
      {type === 'override' && (
        <>
          <div {...stylex.props(styles.overridableCheckboxContainerItem)}>
            <Checkbox checked={false} disabled={true} />
          </div>
          <div {...stylex.props(styles.overridableCheckboxContainerItem)}>
            <div
              {...stylex.props(
                styles.iconWrapper,
                disabled && styles.iconWrapperDisabled,
              )}
              onClick={disabled ? undefined : onChange}
            >
              <AnimatedRotate animateOnHover={!disabled}>
                <IconReload
                  size={theme.icon.size.md}
                  color={theme.color.orange8}
                />
              </AnimatedRotate>
            </div>
          </div>
        </>
      )}
      {type === 'no_cta' && (
        <div {...stylex.props(styles.overridableCheckboxContainerItem)}>
          <AnimatedRotate>
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={() => onChange()}
            />
          </AnimatedRotate>
        </div>
      )}
    </div>
  );
};
