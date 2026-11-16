import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { Tooltip } from '@ui/primitives/surfaces/Tooltip/Tooltip';
import { useTheme } from '@ui/theme';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import {
  animationDuration,
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  iconSize,
  spacing,
} from '../../../theme/tokens.stylex';
import { type MenuPickerProps } from './types/MenuPickerProps';

export const MenuPicker = ({
  id,
  icon: Icon,
  label,
  selected = false,
  disabled = false,
  showLabel = true,
  onClick,
  className,
  xstyle,
  testId,
  tooltipContent,
  tooltipDelay = 0,
  tooltipOffset = 5,
}: MenuPickerProps) => {
  const theme = useTheme();

  return (
    <Tooltip
      content={tooltipContent}
      disabled={!isNonEmptyString(tooltipContent)}
      sideOffset={tooltipOffset}
      side="bottom"
      positionMethod="fixed"
      delay={tooltipDelay}
    >
      <button
        id={id}
        disabled={disabled}
        onClick={onClick}
        {...mergeStylexProps(
          stylex.props(
            styles.root,
            selected && styles.selected,
            disabled && styles.disabled,
            xstyle,
          ),
          className,
        )}
        data-testid={testId}
        data-selected={selected ? '' : undefined}
        aria-pressed={selected}
        aria-disabled={disabled}
        aria-label={label}
      >
        <div {...stylex.props(styles.iconContainer)}>
          <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
        </div>

        {isDefined(label) && showLabel && (
          <div
            {...stylex.props(
              styles.label,
              selected && styles.labelSelected,
              disabled && styles.labelDisabled,
            )}
            data-selected={selected ? '' : undefined}
            data-disabled={disabled ? '' : undefined}
          >
            {label}
          </div>
        )}
      </button>
    </Tooltip>
  );
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderColor: borderColor['--t-border-color-medium'],
    borderEndEndRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderEndStartRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderStartEndRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderStartStartRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    font: 'inherit',
    gap: spacing['--t-spacing-1'],
    inlineSize: '100%',
    justifyContent: 'center',
    minBlockSize: spacing['--t-spacing-8'],
    outline: 'inherit',
    paddingBlock: spacing['--t-spacing-1_5'],
    paddingInline: spacing['--t-spacing-1'],
    transition: `all calc(${animationDuration['--t-animation-duration-instant']} * 1s) ease`,
    userSelect: 'none',
  },
  selected: {
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-primary'],
    },
    borderColor: color['--t-color-blue'],
    color: color['--t-color-blue'],
  },
  disabled: {
    backgroundColor: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-medium'],
    color: fontColor['--t-font-color-extra-light'],
    cursor: 'default',
  },
  iconContainer: {
    alignItems: 'center',
    blockSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    display: 'flex',
    flexShrink: 0,
    inlineSize: `calc(${iconSize['--t-icon-size-md']} * 1px)`,
    justifyContent: 'center',
  },
  label: {
    color: fontColor['--t-font-color-tertiary'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    maxInlineSize: '100%',
    overflow: 'hidden',
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  labelSelected: { color: color['--t-color-blue'] },
  labelDisabled: { color: fontColor['--t-font-color-extra-light'] },
});
