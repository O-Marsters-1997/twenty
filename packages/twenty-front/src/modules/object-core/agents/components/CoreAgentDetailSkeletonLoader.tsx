import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';

import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  skeletonContainer: {
    gap: spacing['--t-spacing-8'],
    display: 'flex',
    flexDirection: 'column',
  },
  formSection: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  iconNameRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-start',
    display: 'flex',
  },
  iconContainer: {
    flexShrink: '0',
  },
  nameContainer: {
    flex: '1',
  },
});

export const CoreAgentDetailSkeletonLoader = () => {
  return (
    <div {...stylex.props(styles.skeletonContainer)}>
      <div {...stylex.props(styles.formSection)}>
        <div {...stylex.props(styles.iconNameRow)}>
          <div {...stylex.props(styles.iconContainer)}>
            <SkeletonLine
              width={SKELETON_HEIGHT_SIZES.l}
              height={SKELETON_HEIGHT_SIZES.l}
            />
          </div>
          <div {...stylex.props(styles.nameContainer)}>
            <SkeletonLine height={SKELETON_HEIGHT_SIZES.l} width="100%" />
          </div>
        </div>

        <SkeletonLine height={SKELETON_HEIGHT_SIZES.l} width="100%" />

        <SkeletonLine height={SKELETON_HEIGHT_SIZES.l} width="100%" />

        <SkeletonLine height={SKELETON_HEIGHT_SIZES.l} width="100%" />

        <SkeletonLine height={SKELETON_HEIGHT_SIZES.l} width="100%" />

        <SkeletonLine height={120} width="100%" />
      </div>
    </div>
  );
};
