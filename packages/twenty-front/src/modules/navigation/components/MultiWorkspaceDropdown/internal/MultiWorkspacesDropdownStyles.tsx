import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { IconChevronDown } from 'twenty-ui/icon';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE } from '@/ui/navigation/navigation-drawer/constants/NavigationDrawerCollapsedButtonSize';

const styles = stylex.create({
  container: {
    padding: `calc(${spacing['--t-spacing-2']} - 1px)`,
    borderColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: 0,
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'flex',
    opacity: 1,
    pointerEvents: 'auto',
    height: spacing['--t-spacing-7'],
    maxWidth: '100%',
    minWidth: 0,
  },
  containerExpanded: {
    padding: `calc(${spacing['--t-spacing-1']} - 1px)`,
    gap: spacing['--t-spacing-2'],
    width: 'fit-content',
  },
  containerCollapsedSize: (size: number) => ({
    height: `${size}px`,
    width: `${size}px`,
  }),
  containerEnabled: {
    borderColor: {
      default: 'transparent',
      ':hover': borderColor['--t-border-color-medium'],
    },
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
  },
  containerDisabled: {
    cursor: 'default',
    opacity: 0.5,
    pointerEvents: 'none',
  },
  labelWrapper: {
    flex: '1 1 auto',
    overflow: 'hidden',
    minWidth: 0,
  },
  label: {
    overflow: 'hidden',
    fontWeight: fontWeight['--t-font-weight-medium'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
  chevronDisabled: {
    color: fontColor['--t-font-color-extra-light'],
  },
});

type StyledContainerProps = ComponentProps<'div'> & {
  isNavigationDrawerExpanded: boolean;
  disabled?: boolean;
};

export const StyledContainer = ({
  isNavigationDrawerExpanded,
  disabled,
  ...props
}: StyledContainerProps) => (
  <div
    {...props}
    {...stylex.props(
      styles.container,
      isNavigationDrawerExpanded
        ? styles.containerExpanded
        : styles.containerCollapsedSize(
            NAVIGATION_DRAWER_COLLAPSED_BUTTON_SIZE,
          ),
      disabled === true ? styles.containerDisabled : styles.containerEnabled,
    )}
  />
);

export const StyledLabelWrapper = (props: StyledLabelWrapperProps<'div'>) => (
  <div {...props} {...stylex.props(styles.labelWrapper)} />
);

export const StyledLabel = (props: StyledLabelProps<'div'>) => (
  <div {...props} {...stylex.props(styles.label)} />
);

export const StyledIconChevronDown = ({
  disabled,
  ...props
}: { disabled?: boolean } & React.ComponentProps<typeof IconChevronDown>) => (
  <div
    {...stylex.props(
      styles.chevron,
      disabled === true && styles.chevronDisabled,
    )}
  >
    {/* oxlint-disable-next-line react/jsx-props-no-spreading */}
    <IconChevronDown {...props} />
  </div>
);
