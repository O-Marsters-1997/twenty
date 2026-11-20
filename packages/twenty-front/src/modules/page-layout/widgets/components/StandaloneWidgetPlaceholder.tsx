import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { Trans } from '@lingui/react/macro';
import { spacing, background } from 'twenty-ui/theme/tokens.stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';

export const StandaloneWidgetPlaceholder = () => {
  return (
    <div {...mergeClassName(stylex.props(styles.container), 'widget')}>
      <EmptyState.Root>
        <AnimatedPlaceholder type="noWidgets" />
        <EmptyState.Content>
          <EmptyState.Title>
            <Trans>Nothing to see</Trans>
          </EmptyState.Title>
          <EmptyState.Description>
            <Trans>This page has no content</Trans>
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    </div>
  );
};

const styles = stylex.create({
  container: {
    padding: spacing['--t-spacing-2'],
    backgroundColor: background['--t-background-secondary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    width: '100%',
  },
});
