import * as stylex from '@stylexjs/stylex';
import { type MouseEvent, type ReactNode } from 'react';
import { IconX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import {
  borderRadius,
  color,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type BaseChipProps = {
  chipId?: string;
  label: string;
  title?: string;
  onRemove?: (event: MouseEvent) => void;
  removeAriaLabel?: string;
  danger?: boolean;
  selected?: boolean;
  isFlashing?: boolean;
  onDoubleClick?: () => void;
  maxWidth?: number;
  leftIcon?: ReactNode;
};

export const BaseChip = ({
  chipId,
  label,
  title,
  onRemove,
  removeAriaLabel = 'Remove',
  danger = false,
  selected = false,
  isFlashing = false,
  onDoubleClick,
  maxWidth,
  leftIcon,
}: BaseChipProps) => {
  const theme = useTheme();
  const isDeletable = onRemove !== undefined;

  return (
    <div
      id={chipId}
      data-selected={selected}
      data-flashing={isFlashing}
      onDoubleClick={onDoubleClick}
      {...stylex.props(
        styles.chip,
        danger && styles.chipDanger,
        selected && (danger ? styles.chipDangerSelected : styles.chipSelected),
        isDeletable && styles.chipDeletable,
        isFlashing && styles.chipFlashing,
      )}
    >
      {leftIcon}
      <span
        title={title ?? label}
        {...stylex.props(
          styles.label,
          maxWidth !== undefined && styles.labelMaxWidth(maxWidth),
        )}
      >
        {label}
      </span>

      {isDeletable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeAriaLabel}
          {...stylex.props(styles.delete, danger && styles.deleteDanger)}
        >
          <IconX size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />
        </button>
      )}
    </div>
  );
};

const flash = stylex.keyframes({
  '0%': { filter: 'none' },
  '50%': { filter: 'brightness(0.85)' },
  '100%': { filter: 'none' },
});

const styles = stylex.create({
  chip: {
    alignItems: 'center',
    backgroundColor: color['--t-color-blue3'],
    borderColor: color['--t-color-blue5'],
    borderRadius: borderRadius['--t-border-radius-sm-round'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    color: color['--t-color-blue'],
    columnGap: spacing['--t-spacing-1'],
    cursor: 'default',
    display: 'inline-flex',
    flexDirection: 'row',
    flexShrink: 0,
    height: 20,
    maxWidth: '100%',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  chipDanger: {
    backgroundColor: color['--t-color-red3'],
    borderColor: color['--t-color-red5'],
    color: color['--t-color-red'],
  },
  chipSelected: {
    backgroundColor: color['--t-color-blue'],
    borderColor: color['--t-color-blue'],
    color: fontColor['--t-font-color-inverted'],
  },
  chipDangerSelected: {
    backgroundColor: color['--t-color-red'],
    borderColor: color['--t-color-red'],
    color: fontColor['--t-font-color-inverted'],
  },
  chipDeletable: {
    cursor: 'pointer',
    paddingRight: 0,
  },
  chipFlashing: {
    animationDuration: '300ms',
    animationIterationCount: 2,
    animationName: flash,
    animationTimingFunction: 'ease-in-out',
  },
  label: {
    lineHeight: '140%',
    maxWidth: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  labelMaxWidth: (maxWidth: number) => ({ maxWidth }),
  delete: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--t-color-blue5'],
    },
    borderBottomRightRadius: borderRadius['--t-border-radius-sm-round'],
    borderStyle: 'none',
    borderTopRightRadius: borderRadius['--t-border-radius-sm-round'],
    boxSizing: 'border-box',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    height: 20,
    justifyContent: 'center',
    marginBlock: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInline: 0,
    userSelect: 'none',
    width: 20,
  },
  deleteDanger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--t-color-red5'],
    },
  },
});
