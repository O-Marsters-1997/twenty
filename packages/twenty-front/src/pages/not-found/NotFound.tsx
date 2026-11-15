import { backgroundTransparent, blur } from 'twenty-ui/theme/tokens.stylex';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { ErrorState } from '@/ui/feedback/empty-state/components/ErrorState';
import { NavigationButton } from '@/ui/input/components/NavigationButton';
import { Trans, useLingui } from '@lingui/react/macro';
import { Suspense, lazy } from 'react';
import { AppPath } from 'twenty-shared/types';

const BackgroundMockPage = lazy(() =>
  import('@/sign-in-background-mock/components/BackgroundMockPage').then(
    (module) => ({ default: module.BackgroundMockPage }),
  ),
);

import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { rootStackingContextZIndices } from '../../modules/ui/layout/constants/rootStackingContextZIndices.stylex';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { MainButton } from 'twenty-ui/components/input';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  backDrop: {
    alignItems: 'center',
    backdropFilter: blur['--t-blur-light'],
    background: backgroundTransparent['--t-background-transparent-secondary'],
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'center',
    left: 0,
    position: 'fixed',
    top: 0,
    width: '100%',
    zIndex: rootStackingContextZIndices.notFound,
  },
  buttonContainer: {
    width: '200px',
  },
});

export const NotFound = () => {
  const { t } = useLingui();

  return (
    <>
      <PageTitle title={t`Page Not Found | Twenty`} />
      <div {...stylex.props(styles.backDrop)}>
        <ErrorState.Root>
          <AnimatedPlaceholder type="error404" />
          <EmptyState.Content>
            <ErrorState.Title>
              <Trans>Off the beaten path</Trans>
            </ErrorState.Title>
            <ErrorState.Description>
              <Trans>
                The page you're seeking is either gone or never was. Let's get
                you back on track
              </Trans>
            </ErrorState.Description>
          </EmptyState.Content>
          <div {...stylex.props(styles.buttonContainer)}>
            <NavigationButton
              buttonComponent={MainButton}
              to={AppPath.Index}
              fullWidth
            >{t`Back to content`}</NavigationButton>
          </div>
        </ErrorState.Root>
      </div>
      <Suspense fallback={null}>
        <BackgroundMockPage />
      </Suspense>
    </>
  );
};
