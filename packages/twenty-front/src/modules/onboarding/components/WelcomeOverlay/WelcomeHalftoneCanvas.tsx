import { useCallback, useRef, useState } from 'react';

import { WelcomeHalftoneCanvasEffect } from '@/onboarding/components/WelcomeOverlay/WelcomeHalftoneCanvasEffect';

import './welcomeHalftone.css';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  canvas: {
    display: 'block',
    height: '100%',
    width: '100%',
  },
});

type WelcomeHalftoneCanvasProps = {
  isLeaving: boolean;
};

export const WelcomeHalftoneCanvas = ({
  isLeaving,
}: WelcomeHalftoneCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWorkerFailed, setHasWorkerFailed] = useState(false);
  const markWorkerAsFailed = useCallback(() => setHasWorkerFailed(true), []);

  return (
    <>
      <canvas
        key={hasWorkerFailed ? 'main-thread' : 'worker'}
        ref={canvasRef}
        aria-hidden="true"
        {...stylex.props(styles.canvas)}
      />
      <WelcomeHalftoneCanvasEffect
        canvasRef={canvasRef}
        isLeaving={isLeaving}
        hasWorkerFailed={hasWorkerFailed}
        onWorkerFailed={markWorkerAsFailed}
      />
    </>
  );
};
