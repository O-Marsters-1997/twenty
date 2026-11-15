import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: '0',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: '0',
  },
  skeletonRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  skeletonFolderInfo: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-2'],
  },
});

const SKELETON_ROWS = [
  { width: 160 },
  { width: 120 },
  { width: 180 },
  { width: 140 },
  { width: 100 },
  { width: 150 },
];

export const SettingsMessageFoldersSkeletonLoader = () => {
  return (
    <div {...stylex.props(styles.skeletonContainer)}>
      {SKELETON_ROWS.map((row, index) => (
        <div key={index} {...stylex.props(styles.skeletonRow)}>
          <div {...stylex.props(styles.skeletonFolderInfo)}>
            <SkeletonLine width={20} height={SKELETON_HEIGHT_SIZES.s} />
            <SkeletonLine width={row.width} height={SKELETON_HEIGHT_SIZES.s} />
          </div>
          <SkeletonLine width={16} height={SKELETON_HEIGHT_SIZES.s} />
        </div>
      ))}
    </div>
  );
};
