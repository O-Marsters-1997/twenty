import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsSectionSkeletonLoaderProps = {
  rowCount?: number;
};

const styles = stylex.create({
  rows: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});

export const SettingsSectionSkeletonLoader = ({
  rowCount = 4,
}: SettingsSectionSkeletonLoaderProps) => {
  return (
    <div {...stylex.props(styles.rows)}>
      <SkeletonLine count={rowCount} height={SKELETON_HEIGHT_SIZES.l} />
    </div>
  );
};
