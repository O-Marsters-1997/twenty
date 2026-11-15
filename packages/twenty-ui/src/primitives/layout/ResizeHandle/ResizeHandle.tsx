import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { clamp } from '@base-ui/utils/clamp';
import { useControlled } from '@base-ui/utils/useControlled';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../styles/focus.stylex';
import {
  animationDuration,
  background,
  borderColor,
  borderRadius,
  fontColor,
} from '../../../theme/tokens.stylex';

import { RESIZE_HANDLE_DEFAULTS } from './internal/ResizeHandleDefaults.constant';
import { RESIZE_HANDLE_EDGES } from './internal/ResizeHandleEdges.constant';
import { useResizeHandleInteraction } from './internal/useResizeHandleInteraction';
import { resizeHandleMarker } from './ResizeHandle.stylex';
import { type ResizeHandleProps } from './types/ResizeHandleProps';

export const ResizeHandle = ({
  axis: requestedAxis = 'y',
  direction,
  edge,
  placement = isDefined(edge) ? 'edge' : 'inline',
  scale = 1,
  dragThreshold = isDefined(edge)
    ? RESIZE_HANDLE_DEFAULTS.edgeDragThreshold
    : RESIZE_HANDLE_DEFAULTS.dragThreshold,
  value: controlledValue,
  defaultValue = RESIZE_HANDLE_DEFAULTS.value,
  onValueChange,
  onValueCommitted,
  onResizeStart,
  onResizeEnd,
  onActivate,
  min = RESIZE_HANDLE_DEFAULTS.min,
  max = RESIZE_HANDLE_DEFAULTS.max,
  step = RESIZE_HANDLE_DEFAULTS.step,
  disabled = false,
  className,
  xstyle,
  children = placement === 'gap' ? null : <div {...stylex.props(styles.bar)} />,
  render,
  ref,
  ...props
}: WithXstyle<ResizeHandleProps>) => {
  const edgeConfiguration = isDefined(edge)
    ? RESIZE_HANDLE_EDGES[edge]
    : undefined;
  const axis = edgeConfiguration?.axis ?? requestedAxis;
  const resolvedDirection = edgeConfiguration?.direction ?? direction;
  const [isResizing, setIsResizing] = useState(false);
  const [value, setValue] = useControlled({
    controlled: controlledValue,
    default: defaultValue,
    name: 'ResizeHandle',
  });
  const boundedValue = clamp(value, min, max);
  const handleValueChange = (nextValue: number) => {
    setValue(nextValue);
    onValueChange?.(nextValue);
  };
  const handleResizeStart = (nextValue: number) => {
    setIsResizing(true);
    onResizeStart?.(nextValue);
  };
  const handleResizeEnd = (details: { cancelled: boolean; value: number }) => {
    setIsResizing(false);
    onResizeEnd?.(details);
  };
  const interactionProps = useResizeHandleInteraction({
    axis,
    direction: resolvedDirection,
    scale,
    dragThreshold,
    onValueCommitted,
    onResizeStart: handleResizeStart,
    onResizeEnd: handleResizeEnd,
    onActivate,
    value: boundedValue,
    onValueChange: handleValueChange,
    min,
    max,
    step,
    disabled,
  });

  return useRender({
    render,
    ref,
    state: { axis, edge, placement, disabled, resizing: isResizing },
    props: mergeProps<'div'>(interactionProps, props, {
      role: 'separator',
      tabIndex: disabled ? -1 : (props.tabIndex ?? 0),
      'aria-label': props['aria-label'] ?? 'Resize',
      'aria-orientation': axis === 'y' ? 'horizontal' : 'vertical',
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': boundedValue,
      'aria-disabled': disabled || undefined,
      'aria-keyshortcuts':
        props['aria-keyshortcuts'] ??
        (isDefined(onActivate) && !disabled ? 'Enter Space' : undefined),
      ...mergeStylexProps(
        stylex.props(resizeHandleMarker, focusStyles.ring, styles.area, xstyle),
        className,
      ),
      children,
    }),
  });
};

const styles = stylex.create({
  area: {
    alignItems: 'center',
    alignSelf: {
      default: null,
      ':is([data-axis="x"])': 'stretch',
    },
    blockSize: {
      default: '8px',
      ':is([data-axis="x"])': 'auto',
      ':is([data-placement="gap"][data-axis="x"])': '100%',
      ':is([data-placement="gap"][data-axis="y"])': 0,
    },
    bottom: {
      default: null,
      ':is([data-placement="edge"][data-axis="x"])': 0,
      ':is([data-placement="edge"][data-edge="bottom"])': 0,
    },
    boxSizing: {
      default: null,
      ':is([data-placement="gap"])': 'content-box',
    },
    cursor: {
      default: 'ns-resize',
      ':is([data-axis="x"])': 'ew-resize',
      ':is([data-disabled])': 'default',
      ':is([data-edge]:not([data-disabled])[data-axis="x"])': 'col-resize',
      ':is([data-edge]:not([data-disabled])[data-axis="y"])': 'row-resize',
    },
    display: 'flex',
    flexShrink: 0,
    inlineSize: {
      default: null,
      ':is([data-axis="x"])': '8px',
      ':is([data-placement="gap"][data-axis="x"])': 0,
      ':is([data-placement="gap"][data-axis="y"])': '100%',
    },
    justifyContent: 'center',
    left: {
      default: null,
      ':is([data-placement="edge"][data-edge="left"])': '-4px',
      ':is([data-placement="edge"][data-axis="y"])': 0,
    },
    marginBlock: {
      default: null,
      ':is([data-placement="gap"][data-axis="x"])': 0,
      ':is([data-placement="gap"][data-axis="y"])': '-4px',
    },
    marginInline: {
      default: null,
      ':is([data-placement="gap"][data-axis="x"])': '-4px',
      ':is([data-placement="gap"][data-axis="y"])': 0,
    },
    opacity: {
      default: null,
      ':is([data-disabled])': 0.5,
    },
    paddingBlock: {
      default: null,
      ':is([data-placement="gap"][data-axis="x"])': 0,
      ':is([data-placement="gap"][data-axis="y"])': '4px',
    },
    paddingInline: {
      default: null,
      ':is([data-placement="gap"][data-axis="x"])': '4px',
      ':is([data-placement="gap"][data-axis="y"])': 0,
    },
    position: {
      default: null,
      ':is([data-placement="edge"])': 'absolute',
      ':is([data-placement="gap"])': 'relative',
    },
    right: {
      default: null,
      ':is([data-placement="edge"][data-edge="right"])': '-4px',
      ':is([data-placement="edge"][data-axis="y"])': 0,
    },
    top: {
      default: null,
      ':is([data-placement="edge"])': 0,
      ':is([data-placement="edge"][data-edge="bottom"])': 'auto',
    },
    touchAction: 'none',
    userSelect: 'none',
    zIndex: {
      default: null,
      ':is([data-placement="gap"])': 1,
    },
  },
  bar: {
    backgroundColor: {
      default: background['--t-background-quaternary'],
      [stylex.when.ancestor(
        ':is(:not([data-disabled]):hover)',
        resizeHandleMarker,
      )]: fontColor['--t-font-color-tertiary'],
      [stylex.when.ancestor(
        ':is([data-edge]:not([data-disabled]):is(:hover, :focus-visible, [data-resizing]))',
        resizeHandleMarker,
      )]: borderColor['--t-border-color-strong'],
    },
    blockSize: {
      default: '3px',
      [stylex.when.ancestor(':is([data-axis="x"])', resizeHandleMarker)]:
        '32px',
      [stylex.when.ancestor(':is([data-edge])', resizeHandleMarker)]: '48px',
      [stylex.when.ancestor(
        ':is([data-edge][data-axis="y"])',
        resizeHandleMarker,
      )]: '3px',
    },
    borderRadius: borderRadius['--t-border-radius-pill'],
    cornerShape: 'round',
    inlineSize: {
      default: '32px',
      [stylex.when.ancestor(':is([data-axis="x"])', resizeHandleMarker)]: '3px',
      [stylex.when.ancestor(':is([data-edge])', resizeHandleMarker)]: '4px',
      [stylex.when.ancestor(
        ':is([data-edge][data-axis="y"])',
        resizeHandleMarker,
      )]: '48px',
    },
    transform: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-edge]:not([data-disabled]):is(:hover, :focus-visible, [data-resizing]))',
        resizeHandleMarker,
      )]: 'scaleY(1.2)',
      [stylex.when.ancestor(
        ':is([data-edge][data-axis="y"]:not([data-disabled]):is(:hover, :focus-visible, [data-resizing]))',
        resizeHandleMarker,
      )]: 'scaleX(1.2)',
    },
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: {
      default: 'background-color',
      [stylex.when.ancestor(':is([data-edge])', resizeHandleMarker)]:
        'background-color, transform',
    },
  },
});
