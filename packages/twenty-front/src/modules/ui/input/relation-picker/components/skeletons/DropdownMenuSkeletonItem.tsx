import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { type CSSWidth } from '@/ui/types/CSSWidth';
import { SKELETON_HEIGHT_SIZES } from 'twenty-ui/primitives/feedback';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';
const styles = stylex.create({
  dropdownMenuSkeletonContainer: {
    '--horizontal-padding': spacing['--t-spacing-1'],
    '--vertical-padding': spacing['--t-spacing-2'],
    borderTopLeftRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderTopRightRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderBottomRightRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderBottomLeftRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    boxSizing: 'border-box',
    flexShrink: '0',
    gap: spacing['--t-spacing-2'],
    height: spacing['--t-spacing-8'],
    paddingLeft: 'var(--horizontal-padding)',
    paddingRight: 'var(--horizontal-padding)',
  },
});

export const DropdownMenuSkeletonItem = ({
  width = '100%',
}: {
  width?: CSSWidth;
}) => {
  return (
    <div {...stylex.props(styles.dropdownMenuSkeletonContainer)}>
      <SkeletonLine
        borderRadius="0.25rem"
        height={SKELETON_HEIGHT_SIZES.s}
        style={{ lineHeight: 0 }}
        width={width}
        baseColor={themeCssVariables.background.quaternary}
        highlightColor={themeCssVariables.background.secondary}
      />
    </div>
  );
};
