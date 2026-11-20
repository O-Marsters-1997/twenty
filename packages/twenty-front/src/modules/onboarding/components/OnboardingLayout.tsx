import { OnboardingHeader } from '@/onboarding/components/OnboardingHeader';
import { ONBOARDING_BACKGROUND_COMPONENT_MIN_VIEWPORT_WIDTH } from '@/onboarding/constants/OnboardingBackgroundComponentMinViewportWidth';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useMediaQuery } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  background: {
    background: background['--t-background-secondary'],
    display: 'flex',
    flexDirection: 'column',
    isolation: 'isolate',
    position: 'relative',
    height: 'calc(100dvh / var(--t-zoom, 1))',
    width: '100%',
  },
  backgroundLayer: {
    inset: '0',
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: '-1',
  },
});

type OnboardingLayoutProps = {
  children: ReactNode;
  onBack?: () => void;
  isBackDisabled?: boolean;
  headerRightComponent?: ReactNode;
  backgroundComponent?: ReactNode;
};

export const OnboardingLayout = ({
  children,
  onBack,
  isBackDisabled,
  headerRightComponent,
  backgroundComponent,
}: OnboardingLayoutProps) => {
  const isBackgroundComponentVisible = useMediaQuery(
    `(min-width: ${ONBOARDING_BACKGROUND_COMPONENT_MIN_VIEWPORT_WIDTH}px)`,
  );

  return (
    <div {...stylex.props(styles.background)}>
      {isDefined(backgroundComponent) && isBackgroundComponentVisible && (
        <div {...stylex.props(styles.backgroundLayer)}>
          {backgroundComponent}
        </div>
      )}
      <OnboardingHeader
        onBack={onBack}
        isBackDisabled={isBackDisabled}
        rightComponent={headerRightComponent}
      />
      {children}
    </div>
  );
};
