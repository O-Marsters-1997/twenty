import { motion } from 'framer-motion';
import { isDefined } from 'twenty-shared/utils';
import { IconGripVertical } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useState,
} from 'react';
import { background, borderRadius } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';

const DRAG_CLICK_SUPPRESSION_DISTANCE = 5;

type WidgetGripProps = {
  className?: string;
};

export const WidgetGrip = ({ className }: WidgetGripProps) => {
  const theme = useTheme();
  // Only pointerdown is tracked: the compatibility mousedown that touch fires
  // afterwards reports the release point, which would hide every drag.
  const [pointerDownPosition, setPointerDownPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setPointerDownPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleClick = (event: ReactMouseEvent) => {
    setPointerDownPosition(null);

    if (
      isDefined(pointerDownPosition) &&
      Math.hypot(
        event.clientX - pointerDownPosition.x,
        event.clientY - pointerDownPosition.y,
      ) > DRAG_CLICK_SUPPRESSION_DISTANCE
    ) {
      event.stopPropagation();
    }
  };

  return (
    <motion.div
      layout
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 20, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{
        duration: theme.animation.duration.fast,
        ease: 'easeInOut',
      }}
      {...mergeClassName(stylex.props(styles.grip), className)}
    >
      <IconGripVertical
        size={theme.icon.size.sm}
        color={theme.font.color.extraLight}
      />
    </motion.div>
  );
};

const styles = stylex.create({
  grip: {
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': background['--t-background-tertiary'],
      ':active': background['--t-background-tertiary'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    cursor: { default: 'grab', ':active': 'grabbing' },
    display: 'flex',
    height: 20,
    justifyContent: 'center',
    userSelect: 'none',
    width: 20,
  },
});
