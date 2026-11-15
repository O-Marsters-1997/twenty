import { useJsonTreeContextOrThrow } from '@ui/components/data-display/JsonTree/internal/hooks/useJsonTreeContextOrThrow';
import { IconChevronDown } from '@ui/icon';
import { VisuallyHidden } from '@ui/primitives/accessibility/components/VisuallyHidden';
import { themeCssVariables, useTheme } from '@ui/theme';
import * as stylex from '@stylexjs/stylex';

import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  spacing,
} from '../../../../theme/tokens.stylex';

export const JsonArrow = ({
  isOpen,
  onClick,
  variant,
}: {
  isOpen: boolean;
  onClick: () => void;
  variant?: 'blue' | 'red';
}) => {
  const theme = useTheme();
  const { arrowButtonCollapsedLabel, arrowButtonExpandedLabel } =
    useJsonTreeContextOrThrow();

  const iconColor =
    variant === 'blue'
      ? themeCssVariables.color.blue
      : variant === 'red'
        ? themeCssVariables.font.color.danger
        : themeCssVariables.font.color.secondary;

  return (
    <button
      {...stylex.props(styles.button, variant === 'red' && styles.red)}
      onClick={onClick}
    >
      <VisuallyHidden>
        {isOpen ? arrowButtonExpandedLabel : arrowButtonCollapsedLabel}
      </VisuallyHidden>

      <div
        {...stylex.props(styles.chevron, isOpen && styles.chevronOpen)}
        data-open={isOpen || undefined}
      >
        <IconChevronDown size={theme.icon.size.md} color={iconColor} />
      </div>
    </button>
  );
};

const styles = stylex.create({
  button: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    height: 24,
    justifyContent: 'center',
    paddingInline: spacing['--t-spacing-1'],
    width: 24,
  },
  red: {
    backgroundColor: background['--t-background-danger'],
    borderColor: borderColor['--t-border-color-danger'],
  },
  chevron: {
    transform: {
      default: 'rotate(-90deg)',
      ':dir(rtl)': 'rotate(90deg)',
    },
    transitionDuration: '0.3s',
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease',
  },
  chevronOpen: {
    transform: 'rotate(0deg)',
  },
});
