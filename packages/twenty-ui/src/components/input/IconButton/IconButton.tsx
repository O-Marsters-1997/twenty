import * as stylex from '@stylexjs/stylex';
import { isNonEmptyString } from '@sniptt/guards';
import { useContext } from 'react';

import { Button } from '@ui/primitives/input/Button/Button';
import { ButtonGroupContext } from '@ui/primitives/input/ButtonGroup/internal/ButtonGroupContext';
import { Tooltip } from '@ui/primitives/surfaces/Tooltip/Tooltip';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { mergeXstyles } from '@ui/utilities/internal/mergeXstyles';

import { background, fontColor, spacing } from '../../../theme/tokens.stylex';
import './IconButton.css';
import { type IconButtonProps } from './types/IconButtonProps';

export const IconButton = ({
  children,
  size,
  shape = 'square',
  color,
  variant,
  xstyle,
  tooltip,
  tooltipPlace = 'bottom',
  tooltipDelay = 1000,
  tooltipOffset = 5,
  disabled,
  loading,
  ...props
}: IconButtonProps) => {
  const buttonGroup = useContext(ButtonGroupContext);
  const resolvedSize = size ?? buttonGroup?.size ?? 'md';
  const hasTooltip = isNonEmptyString(tooltip);
  const isDisabled = disabled || loading;
  const isRoundDisabledAccentSolid =
    isDisabled === true &&
    shape === 'round' &&
    (variant ?? buttonGroup?.variant) === 'solid' &&
    (color ?? buttonGroup?.color) === 'accent';
  const button = (
    <Button
      {...props}
      color={color}
      variant={variant}
      size={resolvedSize === 'xs' ? 'sm' : resolvedSize}
      data-icon-size={resolvedSize}
      data-shape={shape}
      disabled={disabled}
      loading={loading}
      startIcon={
        <span
          {...mergeStylexProps(
            stylex.props(styles.icon),
            'tw-icon-button-icon',
          )}
        >
          {children}
        </span>
      }
      xstyle={mergeXstyles(
        styles.root,
        sizeStyles[resolvedSize],
        shape === 'round' && styles.round,
        isRoundDisabledAccentSolid && styles.roundDisabledAccentSolid,
        xstyle,
      )}
    />
  );

  if (!hasTooltip) {
    return button;
  }

  return (
    <Tooltip
      content={tooltip}
      delay={tooltipDelay}
      side={tooltipPlace}
      sideOffset={tooltipOffset}
    >
      {isDisabled ? (
        <span {...stylex.props(styles.tooltipAnchor)}>{button}</span>
      ) : (
        button
      )}
    </Tooltip>
  );
};

const styles = stylex.create({
  root: { maxInlineSize: 'none', paddingInline: 0 },
  sizeMd: { inlineSize: spacing['--t-spacing-8'] },
  sizeSm: { inlineSize: spacing['--t-spacing-6'] },
  sizeXs: { inlineSize: spacing['--t-spacing-5'] },
  round: { '--t-corner-shape': 'round', '--tw-button-radius': '50%' },
  roundDisabledAccentSolid: {
    '--tw-button-background': background['--t-background-quaternary'],
    '--tw-button-color': fontColor['--t-font-color-tertiary'],
    cursor: 'default',
    opacity: 1,
  },
  tooltipAnchor: { display: 'inline-flex' },
  icon: { alignItems: 'center', display: 'flex', justifyContent: 'center' },
});

const sizeStyles = {
  md: styles.sizeMd,
  sm: styles.sizeSm,
  xs: styles.sizeXs,
};
