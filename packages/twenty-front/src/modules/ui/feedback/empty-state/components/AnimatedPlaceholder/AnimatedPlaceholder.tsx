import * as stylex from '@stylexjs/stylex';
import { useEffect, useRef } from 'react';
import { type AnimatedPlaceholderType } from './types/AnimatedPlaceholderType';

import { BACKGROUND } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/constants/Background';
import { DARK_BACKGROUND } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/constants/DarkBackground';
import { DARK_MOVING_IMAGE } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/constants/DarkMovingImage';
import { MOVING_IMAGE } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/constants/MovingImage';
import { isDefined } from 'twenty-shared/utils';
import { useThemeColorScheme } from 'twenty-ui/theme';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '100px',
    position: 'relative',
  },
  backgroundImage: {
    maxHeight: '160px',
    maxWidth: '160px',
  },
  backgroundImageLarge: {
    maxHeight: '245px',
    maxWidth: '245px',
  },
  movingImage: {
    maxHeight: '130px',
    maxWidth: '130px',
    position: 'absolute',
    transform: 'translate(var(--parallax-x, 0), var(--parallax-y, 0))',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-out',
    zIndex: 2,
  },
  movingImageLarge: {
    maxHeight: '185px',
    maxWidth: '185px',
  },
});

const PARALLAX_OFFSET_IN_PX = 2;

type AnimatedPlaceholderProps = {
  type: AnimatedPlaceholderType;
  assetBasePath?: string;
};

export const AnimatedPlaceholder = ({
  type,
  assetBasePath = '',
}: AnimatedPlaceholderProps) => {
  const colorScheme = useThemeColorScheme();
  const movingImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const movingImage = movingImageRef.current;
    if (movingImage === null) {
      return;
    }

    const setParallax = ({
      offsetX,
      offsetY,
    }: {
      offsetX: number;
      offsetY: number;
    }) => {
      movingImage.style.setProperty('--parallax-x', `${offsetX}px`);
      movingImage.style.setProperty('--parallax-y', `${offsetY}px`);
    };

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const point = 'touches' in event ? event.touches[0] : event;

      if (!isDefined(point)) {
        return;
      }

      setParallax({
        offsetX:
          (point.clientX / window.innerWidth) * 2 * PARALLAX_OFFSET_IN_PX -
          PARALLAX_OFFSET_IN_PX,
        offsetY:
          (point.clientY / window.innerHeight) * 2 * PARALLAX_OFFSET_IN_PX -
          PARALLAX_OFFSET_IN_PX,
      });
    };

    const handleLeave = () => {
      setParallax({ offsetX: 0, offsetY: 0 });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.document.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.document.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  const isLarge = type === 'error500' || type === 'error404';

  return (
    <div {...stylex.props(styles.container)}>
      <img
        src={`${assetBasePath}${colorScheme === 'dark' ? DARK_BACKGROUND[type] : BACKGROUND[type]}`}
        alt=""
        {...stylex.props(
          styles.backgroundImage,
          isLarge && styles.backgroundImageLarge,
        )}
      />
      <img
        ref={movingImageRef}
        src={`${assetBasePath}${colorScheme === 'dark' ? DARK_MOVING_IMAGE[type] : MOVING_IMAGE[type]}`}
        alt=""
        {...stylex.props(
          styles.movingImage,
          isLarge && styles.movingImageLarge,
        )}
      />
    </div>
  );
};
