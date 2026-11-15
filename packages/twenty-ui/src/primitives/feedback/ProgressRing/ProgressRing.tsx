import { isFunction, isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { Progress } from '../Progress/Progress';

import { progressRingStyles } from './ProgressRing.stylex';
import { ProgressRingIndicator } from './internal/ProgressRingIndicator';
import { type ProgressRingProps } from './types/ProgressRingProps';

export const ProgressRing = ({
  size = 'md',
  barColor,
  children,
  className,
  style,
  xstyle,
  ...props
}: WithXstyle<ProgressRingProps>) => {
  const stylexProps = stylex.props(progressRingStyles.root, xstyle);

  return (
    <Progress.Root
      {...props}
      className={mergeStylexProps(stylexProps, className).className}
      style={(state) =>
        ({
          ...stylexProps.style,
          ...(isNonEmptyString(barColor)
            ? { '--progress-ring-color': barColor }
            : {}),
          ...(isFunction(style) ? style(state) : style),
        }) as CSSProperties
      }
    >
      {children}
      <ProgressRingIndicator size={size} />
    </Progress.Root>
  );
};
