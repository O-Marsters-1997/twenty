import { type NavigationDrawerSubItemState } from '@/ui/navigation/navigation-drawer/types/NavigationDrawerSubItemState';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import { borderColor, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import './NavigationDrawerItemBreadcrumb.css';

export type NavigationDrawerItemBreadcrumbProps = {
  state?: NavigationDrawerSubItemState;
};

const styles = stylex.create({
  container: {
    marginInlineEnd: spacing['--t-spacing-2'],
    marginInlineStart: '7.5px',
    position: 'relative',
    height: {
      default: spacing['--t-spacing-7'],
      [media.mobile]: spacing['--t-spacing-8'],
    },
    width: '9px',
  },
  gapVerticalLine: {
    backgroundColor: borderColor['--t-border-color-strong'],
    position: 'absolute',
    height: '2px',
    top: '-2px',
    width: '1px',
  },
  secondaryFullVerticalBar: {
    backgroundColor: borderColor['--t-border-color-strong'],
    position: 'absolute',
    height: '100%',
    top: 0,
    width: '1px',
  },
  roundedProtrusion: {
    borderColor: borderColor['--t-border-color-strong'],
    borderStyle: 'solid',
    borderEndStartRadius: '4px',
    borderInlineEndWidth: 0,
    borderInlineStartWidth: '1px',
    position: 'absolute',
    zIndex: 'auto',
    borderBottomWidth: '1px',
    borderTopWidth: 0,
    height: '14px',
    top: 0,
    width: '8px',
  },
  darkerBackground: {
    backgroundColor: fontColor['--t-font-color-tertiary'],
  },
  darkerBorder: {
    borderColor: fontColor['--t-font-color-tertiary'],
    zIndex: 1,
  },
});

export const NavigationDrawerItemBreadcrumb = ({
  state,
}: NavigationDrawerItemBreadcrumbProps) => {
  const showVerticalBar =
    state !== 'last-not-selected' && state !== 'last-selected';

  const verticalBarShouldBeDarker = state === 'intermediate-before-selected';

  const protrusionShouldBeDarker =
    state === 'intermediate-selected' || state === 'last-selected';

  const gapShouldBeDarker =
    state === 'intermediate-before-selected' ||
    state === 'intermediate-selected' ||
    state === 'last-selected';

  return (
    <div
      data-navigation-drawer-item-breadcrumb=""
      {...stylex.props(styles.container)}
    >
      <div
        {...stylex.props(
          styles.gapVerticalLine,
          gapShouldBeDarker && styles.darkerBackground,
        )}
      />
      <div
        {...stylex.props(
          styles.roundedProtrusion,
          protrusionShouldBeDarker && styles.darkerBorder,
        )}
      />
      {showVerticalBar && (
        <div
          {...stylex.props(
            styles.secondaryFullVerticalBar,
            verticalBarShouldBeDarker && styles.darkerBackground,
          )}
        />
      )}
    </div>
  );
};
