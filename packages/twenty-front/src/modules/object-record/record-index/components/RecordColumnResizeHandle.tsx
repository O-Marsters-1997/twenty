import * as stylex from '@stylexjs/stylex';
import { type PointerEvent as ReactPointerEvent } from 'react';
import { color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  handle: {
    bottom: 0,
    cursor: 'col-resize',
    position: 'absolute',
    top: 0,
    width: '10px',
    zIndex: 1,
  },
  handleLeft: {
    left: '-1px',
  },
  handleRight: {
    right: '-1px',
  },
  indicator: {
    backgroundColor: color['--t-color-blue'],
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: '2px',
  },
  indicatorLeft: {
    left: '-1px',
  },
  indicatorRight: {
    right: '-1px',
  },
});

type RecordColumnResizeHandleProps = {
  isResizing: boolean;
  position: 'left' | 'right';
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export const RecordColumnResizeHandle = ({
  isResizing,
  position,
  onPointerDown,
}: RecordColumnResizeHandleProps) => (
  <div
    role="separator"
    aria-orientation="vertical"
    data-dnd-drag-disable
    onPointerDown={onPointerDown}
    {...stylex.props(
      styles.handle,
      position === 'left' ? styles.handleLeft : styles.handleRight,
    )}
  >
    {isResizing && (
      <div
        {...stylex.props(
          styles.indicator,
          position === 'left' ? styles.indicatorLeft : styles.indicatorRight,
        )}
      />
    )}
  </div>
);
