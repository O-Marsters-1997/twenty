import { isFunction, isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { getProgressIndicatorPercentage } from '../Progress/internal/getProgressIndicatorPercentage';
import { Progress } from '../Progress/Progress';

import { progressBarStyles } from './ProgressBar.stylex';
import { type ProgressBarProps } from './types/ProgressBarProps';

export const ProgressBar = ({
  size = 'md',
  className,
  style,
  xstyle,
  children,
  barColor,
  backgroundColor = 'none',
  withBorderRadius = false,
  withMinimumFillWidth = true,
  ...props
}: WithXstyle<ProgressBarProps>) => {
  const barProps = stylex.props(
    progressBarStyles.bar,
    size === 'sm' && progressBarStyles.barSm,
    withBorderRadius && progressBarStyles.rounded,
    xstyle,
  );

  return (
    <Progress.Root
      {...props}
      className={mergeStylexProps(barProps, className).className}
      data-size={size}
      data-with-border-radius={withBorderRadius || undefined}
      style={(state) =>
        ({
          ...barProps.style,
          '--progress-bar-background-color': backgroundColor,
          ...(isNonEmptyString(barColor)
            ? { '--progress-bar-color': barColor }
            : {}),
          ...(isFunction(style) ? style(state) : style),
        }) as CSSProperties
      }
    >
      <Progress.Track {...stylex.props(progressBarStyles.track)}>
        <Progress.Indicator
          {...stylex.props(
            progressBarStyles.indicator,
            withBorderRadius && progressBarStyles.indicatorRounded,
          )}
          data-with-border-radius={withBorderRadius || undefined}
          render={(indicatorProps) => {
            const percentage = getProgressIndicatorPercentage({
              width: indicatorProps.style?.width,
              fallbackPercentage: 0,
            });
            const hasMinimumFill =
              withMinimumFillWidth && percentage > 0 && percentage < 100;

            return (
              <div
                {...indicatorProps}
                data-minimum-fill={hasMinimumFill || undefined}
              />
            );
          }}
        />
      </Progress.Track>
      {children}
    </Progress.Root>
  );
};
