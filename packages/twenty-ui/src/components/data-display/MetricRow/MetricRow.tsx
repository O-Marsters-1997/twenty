import { useRender } from '@base-ui/react/use-render';
import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';

import { ProgressRing } from '@ui/primitives/feedback/ProgressRing/ProgressRing';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';
import { type MetricRowProps } from './types/MetricRowProps';

export const MetricRow = ({
  children,
  startIcon,
  value,
  progress,
  progressColor,
  progressValueText,
  render,
  ref,
  className,
  xstyle,
  ...props
}: WithXstyle<MetricRowProps>) => {
  const labelId = useId();
  const accessibleValueText = progressValueText ?? value;

  return useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.row, xstyle), className),
      children: (
        <>
          <div {...stylex.props(styles.label)}>
            {isDefined(startIcon) && (
              <span {...stylex.props(styles.icon)} aria-hidden="true">
                {startIcon}
              </span>
            )}
            <span id={labelId}>{children}</span>
          </div>
          {isDefined(progress) ? (
            <ProgressRing
              value={progress}
              size="sm"
              barColor={progressColor}
              aria-labelledby={labelId}
              {...(isNonEmptyString(accessibleValueText)
                ? { 'aria-valuetext': accessibleValueText }
                : {})}
            >
              {value}
            </ProgressRing>
          ) : (
            <span>{value}</span>
          )}
        </>
      ),
    },
  });
};

const styles = stylex.create({
  row: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-2'],
    minHeight: 24,
  },
  label: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    gap: spacing['--t-spacing-1'],
    minWidth: 0,
  },
  icon: {
    display: 'flex',
    flexShrink: 0,
  },
});
