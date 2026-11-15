import { type NavigationDrawerSubItemState } from '@/ui/navigation/navigation-drawer/types/NavigationDrawerSubItemState';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  borderColor,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import './NavigationDrawerItemBreadcrumb.css';

export type NavigationDrawerItemBreadcrumbProps = {
  state?: NavigationDrawerSubItemState;
};

const styles = stylex.create({
  container: {
    height: {
      default: spacing['--t-spacing-7'],
      [media.mobile]: spacing['--t-spacing-8'],
    },
    marginInlineEnd: spacing['--t-spacing-2'],
    marginInlineStart: '7.5px',
    position: 'relative',
    width: '9px',
  },
  gapVerticalLine: {
    backgroundColor: borderColor['--t-border-color-strong'],
    height: '2px',
    position: 'absolute',
    top: '-2px',
    width: '1px',
  },
  secondaryFullVerticalBar: {
    backgroundColor: borderColor['--t-border-color-strong'],
    height: '100%',
    position: 'absolute',
    top: 0,
    width: '1px',
  },
  roundedProtrusion: {
    borderBottomWidth: '1px',
    borderColor: borderColor['--t-border-color-strong'],
    borderEndStartRadius: '4px',
    borderInlineEndWidth: 0,
    borderInlineStartWidth: '1px',
    borderStyle: 'solid',
    borderTopWidth: 0,
    height: '14px',
    position: 'absolute',
    top: 0,
    width: '8px',
    zIndex: 'auto',
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
