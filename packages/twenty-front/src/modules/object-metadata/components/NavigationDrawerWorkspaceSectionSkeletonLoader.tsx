import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fillSkeleton: {
    display: 'block',
    width: '100%',
  },
  titleSkeleton: {
    alignItems: 'center',
    display: 'flex',
    height: spacing['--t-spacing-5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-0_5'],
  },
  rowsContainer: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    width: '100%',
  },
});

const FILL_SKELETON_CONTAINER_CLASS_NAME = stylex.props(
  styles.fillSkeleton,
).className;

export const NavigationDrawerWorkspaceSectionSkeletonLoader = () => {
  return (
    <NavigationDrawerSection>
      <div {...stylex.props(styles.titleSkeleton)}>
        <SkeletonLine
          width={72}
          height={SKELETON_HEIGHT_SIZES.xs}
          highlightColor={themeCssVariables.background.transparent.light}
        />
      </div>
      <div {...stylex.props(styles.rowsContainer)}>
        <SkeletonLine
          containerClassName={FILL_SKELETON_CONTAINER_CLASS_NAME}
          height={SKELETON_HEIGHT_SIZES.s}
          highlightColor={themeCssVariables.background.transparent.light}
        />
        <SkeletonLine
          containerClassName={FILL_SKELETON_CONTAINER_CLASS_NAME}
          height={SKELETON_HEIGHT_SIZES.s}
          highlightColor={themeCssVariables.background.transparent.light}
        />
        <SkeletonLine
          containerClassName={FILL_SKELETON_CONTAINER_CLASS_NAME}
          height={SKELETON_HEIGHT_SIZES.s}
          highlightColor={themeCssVariables.background.transparent.light}
        />
      </div>
    </NavigationDrawerSection>
  );
};
