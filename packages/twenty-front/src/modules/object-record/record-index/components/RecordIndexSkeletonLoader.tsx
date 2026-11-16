import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { PageContentSkeletonLoader } from '~/loading/components/PageContentSkeletonLoader';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  secondaryBar: {
    alignItems: 'center',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'space-between',
    minHeight: spacing['--t-spacing-10'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-3'],
  },
});

export const RecordIndexSkeletonLoader = () => (
  <PageContentSkeletonLoader
    secondaryBar={
      <div {...stylex.props(styles.secondaryBar)}>
        <SkeletonLine width={120} height={SKELETON_HEIGHT_SIZES.s} />
        <SkeletonLine width={180} height={SKELETON_HEIGHT_SIZES.s} />
      </div>
    }
  />
);
