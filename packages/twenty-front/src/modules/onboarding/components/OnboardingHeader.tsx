import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronLeft } from 'twenty-ui/icon';
import { media } from 'twenty-ui/theme/constants.stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { onboardingLayout } from '../constants/onboardingLayout.stylex';

const styles = stylex.create({
  header: {
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '1px',
    paddingLeft: {
      default: spacing['--t-spacing-8'],
      [media.mobile]: spacing['--t-spacing-4'],
    },
    paddingRight: {
      default: spacing['--t-spacing-8'],
      [media.mobile]: spacing['--t-spacing-4'],
    },
    paddingTop: spacing['--t-spacing-8'],
    width: '100%',
  },
  side: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    minWidth: '0',
  },
  leftSide: {
    flexBasis: { default: '0', [media.mobile]: 'auto' },
    flexGrow: { default: 1, [media.mobile]: 0 },
    flexShrink: { default: 1, [media.mobile]: 0 },
    justifyContent: { default: 'flex-end', [media.mobile]: 'flex-start' },
    paddingRight: spacing['--t-spacing-1'],
  },
  rightSide: {
    flexBasis: '0',
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'flex-end',
    paddingLeft: spacing['--t-spacing-1'],
  },
  center: {
    alignItems: 'center',
    display: 'flex',
    flexBasis: {
      default: onboardingLayout.contentBlockWidth,
      [media.mobile]: 'auto',
    },
    flexGrow: 0,
    flexShrink: 1,
    justifyContent: 'flex-start',
    minWidth: '0',
  },
  logo: {
    backgroundImage: "url('/images/integrations/twenty-logo.svg')",
    backgroundSize: 'cover',
    opacity: '0.4',
    height: spacing['--t-spacing-6'],
    width: spacing['--t-spacing-6'],
  },
});

type OnboardingHeaderProps = {
  onBack?: () => void;
  isBackDisabled?: boolean;
  rightComponent?: ReactNode;
};

export const OnboardingHeader = ({
  onBack,
  isBackDisabled,
  rightComponent,
}: OnboardingHeaderProps) => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.header)}>
      <div {...stylex.props(styles.side, styles.leftSide)}>
        {isDefined(onBack) && (
          <LightIconButton
            emphasis="subtle"
            size="sm"
            onClick={onBack}
            disabled={isBackDisabled}
            aria-label={t`Go back`}
          >
            <IconChevronLeft />
          </LightIconButton>
        )}
      </div>
      <div {...stylex.props(styles.center)}>
        <div {...stylex.props(styles.logo)} />
      </div>
      <div {...stylex.props(styles.side, styles.rightSide)}>
        {rightComponent}
      </div>
    </div>
  );
};
