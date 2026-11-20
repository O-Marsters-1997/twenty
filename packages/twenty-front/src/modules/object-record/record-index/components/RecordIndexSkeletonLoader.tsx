import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { PageContentSkeletonLoader } from '~/loading/components/PageContentSkeletonLoader';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  secondaryBar: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'space-between',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    minHeight: spacing['--t-spacing-10'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: '0',
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
