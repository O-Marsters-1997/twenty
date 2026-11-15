import { forwardRef } from 'react';
import {
  IconRadiusBottomLeft,
  IconRadiusBottomRight,
  IconRadiusTopLeft,
  IconRadiusTopRight,
} from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  iconStroke,
  spacing,
  borderRadius,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';
import { resizeHandleMarker } from './PageLayoutGridResizeHandle.stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
type WidgetHandleAxis = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type WidgetHorizontalHandleAxis = 'n' | 's';
type WidgetVerticalHandleAxis = 'e' | 'w';

type PageLayoutGridResizeHandleProps = {
  handleAxis?: WidgetHandleAxis;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
  className?: string;
  style?: React.CSSProperties;
};

const isVerticalHandle = (
  widgetHandleAxis?: WidgetHandleAxis,
): widgetHandleAxis is WidgetVerticalHandleAxis =>
  widgetHandleAxis === 'w' || widgetHandleAxis === 'e';

const isHorizontalHandle = (
  widgetHandleAxis?: WidgetHandleAxis,
): widgetHandleAxis is WidgetHorizontalHandleAxis =>
  widgetHandleAxis === 'n' || widgetHandleAxis === 's';

export const PageLayoutGridResizeHandle = forwardRef<
  HTMLDivElement,
  PageLayoutGridResizeHandleProps
>(
  (
    {
      handleAxis: widgetHandleAxis,
      onMouseDown,
      onMouseUp,
      onTouchEnd,
      className,
      style,
    },
    ref,
  ) => {
    const theme = useTheme();

    return (
      <div
        ref={ref}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        {...mergeClassName(
          stylex.props(
            styles.resizeHandleWrapper,
            widgetHandleAxis !== undefined &&
              styles[`axis_${widgetHandleAxis}`],
          ),
          className,
        )}
        style={style}
      >
        {isVerticalHandle(widgetHandleAxis) && (
          <div
            {...stylex.props(
              resizeHandleMarker,
              styles.verticalHandleWrapper,
              widgetHandleAxis === 'w' ? styles.shiftStart : styles.shiftEnd,
            )}
          >
            <div {...stylex.props(styles.handleBar, styles.verticalHandle)} />
          </div>
        )}
        {isHorizontalHandle(widgetHandleAxis) && (
          <div
            {...stylex.props(
              resizeHandleMarker,
              styles.horizontalHandleWrapper,
              widgetHandleAxis === 'n'
                ? styles.shiftBlockStart
                : styles.shiftBlockEnd,
            )}
          >
            <div {...stylex.props(styles.handleBar, styles.horizontalHandle)} />
          </div>
        )}
        {widgetHandleAxis === 'ne' && (
          <div
            data-resize-corner="ne"
            {...stylex.props(styles.cornerIconWrapper, styles.cursorNesw)}
          >
            <IconRadiusTopRight
              size={theme.icon.size.lg}
              stroke={theme.icon.stroke.lg}
            />
          </div>
        )}
        {widgetHandleAxis === 'nw' && (
          <div
            data-resize-corner="nw"
            {...stylex.props(styles.cornerIconWrapper, styles.cursorNwse)}
          >
            <IconRadiusTopLeft
              size={theme.icon.size.lg}
              stroke={theme.icon.stroke.lg}
            />
          </div>
        )}
        {widgetHandleAxis === 'se' && (
          <div
            data-resize-corner="se"
            {...stylex.props(styles.cornerIconWrapper, styles.cursorNwse)}
          >
            <IconRadiusBottomRight
              size={theme.icon.size.lg}
              stroke={theme.icon.stroke.lg}
            />
          </div>
        )}
        {widgetHandleAxis === 'sw' && (
          <div
            data-resize-corner="sw"
            {...stylex.props(styles.cornerIconWrapper, styles.cursorNesw)}
          >
            <IconRadiusBottomLeft
              size={theme.icon.size.lg}
              stroke={theme.icon.stroke.lg}
            />
          </div>
        )}
      </div>
    );
  },
);

const styles = stylex.create({
  resizeHandleWrapper: { position: 'absolute' },
  axis_n: {
    bottom: 'auto',
    left: '50%',
    right: 'auto',
    top: spacing['--t-spacing-1_5'],
    transform: 'translateX(-50%)',
  },
  axis_s: {
    bottom: spacing['--t-spacing-1_5'],
    left: '50%',
    right: 'auto',
    top: 'auto',
    transform: 'translateX(-50%)',
  },
  axis_e: {
    bottom: 'auto',
    left: 'auto',
    right: spacing['--t-spacing-1_5'],
    top: '50%',
    transform: 'translateY(-50%)',
  },
  axis_w: {
    bottom: 'auto',
    left: spacing['--t-spacing-1_5'],
    right: 'auto',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  axis_ne: {
    bottom: 'auto',
    left: 'auto',
    right: '0',
    top: '0',
    transform: `translate(${spacing['--t-spacing-1']}, calc(-1 * ${spacing['--t-spacing-1']}))`,
  },
  axis_nw: {
    bottom: 'auto',
    left: '0',
    right: 'auto',
    top: '0',
    transform: `translate(calc(-1 * ${spacing['--t-spacing-1']}), calc(-1 * ${spacing['--t-spacing-1']}))`,
  },
  axis_se: {
    bottom: '0',
    left: 'auto',
    right: '0',
    top: 'auto',
    transform: `translate(${spacing['--t-spacing-1']}, ${spacing['--t-spacing-1']})`,
  },
  axis_sw: {
    bottom: '0',
    left: '0',
    right: 'auto',
    top: 'auto',
    transform: `translate(calc(-1 * ${spacing['--t-spacing-1']}), ${spacing['--t-spacing-1']})`,
  },
  cornerIconWrapper: {
    alignItems: 'center',
    display: 'flex',
    height: spacing['--t-spacing-4'],
    justifyContent: 'center',
    width: spacing['--t-spacing-4'],
  },
  cursorNwse: { cursor: 'nwse-resize' },
  cursorNesw: { cursor: 'nesw-resize' },
  verticalHandleWrapper: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    cursor: 'col-resize',
    padding: spacing['--t-spacing-2'],
  },
  horizontalHandleWrapper: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    cursor: 'row-resize',
    padding: spacing['--t-spacing-2'],
  },
  shiftStart: { transform: 'translateX(-50%)' },
  shiftEnd: { transform: 'translateX(50%)' },
  shiftBlockStart: { transform: 'translateY(-50%)' },
  shiftBlockEnd: { transform: 'translateY(50%)' },
  handleBar: {
    backgroundColor: {
      default: null,
      [stylex.when.ancestor(':hover', resizeHandleMarker)]:
        fontColor['--t-font-color-tertiary'],
    },
    borderRadius: borderRadius['--t-border-radius-pill'],
    cornerShape: 'round',
  },
  verticalHandle: {
    height: spacing['--t-spacing-5'],
    width: `calc(${iconStroke['--t-icon-stroke-lg']} * 1px)`,
  },
  horizontalHandle: {
    height: `calc(${iconStroke['--t-icon-stroke-lg']} * 1px)`,
    width: spacing['--t-spacing-5'],
  },
});
