import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import * as stylex from '@stylexjs/stylex';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

export const SidePanelSkeletonLoader = () => {
  return (
    <div {...stylex.props(styles.container)}>
      <SkeletonLine height={SKELETON_HEIGHT_SIZES.m} width={140} />
    </div>
  );
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: spacing['--t-spacing-4'],
    width: '100%',
  },
});
