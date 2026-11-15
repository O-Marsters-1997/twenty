import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from 'react';

import { type MenuItemAccent } from '@ui/components/navigation/MenuItem/types/MenuItemAccent';
import { IconCheck } from '@ui/icon';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  animationDuration,
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../../theme/tokens.stylex';
import './StyledMenuItemBase.css';
import { menuItemMarker } from './StyledMenuItemBase.stylex';

const horizontalPadding = spacing['--t-spacing-1'];
const verticalPadding = spacing['--t-spacing-2'];
const concentricRadius = `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`;

const styles = stylex.create({
  root: {
    alignItems: 'center',
    blockSize: `calc(32px - 2 * ${verticalPadding})`,
    borderEndEndRadius: concentricRadius,
    borderEndStartRadius: concentricRadius,
    borderStartEndRadius: concentricRadius,
    borderStartStartRadius: concentricRadius,
    boxSizing: 'content-box',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-2'],
    inlineSize: `calc(100% - 2 * ${horizontalPadding})`,
    justifyContent: 'space-between',
    paddingBlock: verticalPadding,
    paddingInline: horizontalPadding,
    position: 'relative',
    transition: 'background 0.1s ease',
    userSelect: 'none',
  },
  dragCursor: { cursor: 'grab' },
  defaultCursor: { cursor: 'default' },
  accentDanger: { color: fontColor['--t-font-color-danger'] },
  accentPlaceholder: { color: fontColor['--t-font-color-tertiary'] },
  disabled: {
    color: fontColor['--t-font-color-tertiary'],
    transition: 'none',
  },
  noTransition: { transition: 'none' },
  idleLight: {
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
  },
  idleTransparent: { backgroundColor: 'transparent' },
  idleDanger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-danger'],
    },
  },
  highlightedLight: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  highlightedTransparent: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': 'transparent',
    },
  },
  highlightedDanger: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-danger'],
    },
  },
  label: {
    display: 'flex',
    flexDirection: 'row',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  labelLight: {
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    flexDirection: 'row',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  noIconFiller: { inlineSize: spacing['--t-spacing-1'] },
  leftContent: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
    inlineSize: '100%',
    minInlineSize: 0,
  },
  rightContent: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
  },
  draggableItem: { alignItems: 'center', cursor: 'grab', display: 'flex' },
  iconCheckContainer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    marginInlineEnd: spacing['--t-spacing-1'],
  },
  contextualText: {
    color: fontColor['--t-font-color-light'],
    flexShrink: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    overflow: 'hidden',
    paddingInlineStart: spacing['--t-spacing-1'],
  },
  rightContextualText: {
    color: fontColor['--t-font-color-light'],
    flexShrink: 1,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    overflow: 'hidden',
    paddingInlineStart: spacing['--t-spacing-1'],
    textAlign: 'end',
  },
  hoverableButtons: {
    opacity: 1,
    transition: `opacity calc(${animationDuration['--t-animation-duration-instant']} * 1s) ease`,
  },
  hoverableButtonsHoverOnly: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', menuItemMarker)]: 1,
    },
  },
});

const backgroundStyles = {
  idle: {
    light: styles.idleLight,
    transparent: styles.idleTransparent,
    danger: styles.idleDanger,
  },
  highlighted: {
    light: styles.highlightedLight,
    transparent: styles.highlightedTransparent,
    danger: styles.highlightedDanger,
  },
};

export type MenuItemBaseProps = {
  accent?: MenuItemAccent;
  isKeySelected?: boolean;
  isHoverBackgroundDisabled?: boolean;
  hovered?: boolean;
  disabled?: boolean;
  focused?: boolean;
};

type StyledMenuItemBaseElementProps = WithXstyle<
  MenuItemBaseProps & ComponentPropsWithoutRef<'div'>
>;

const getMenuItemBaseStyles = ({
  accent,
  isKeySelected,
  isHoverBackgroundDisabled,
  disabled,
  focused,
}: MenuItemBaseProps) => {
  const isHighlighted = isKeySelected === true || focused === true;
  const isDisabled = disabled === true;
  const hoverBackground = isDisabled
    ? isHighlighted
      ? 'light'
      : 'transparent'
    : accent === 'danger'
      ? 'danger'
      : isHoverBackgroundDisabled === true
        ? 'transparent'
        : 'light';

  return [
    menuItemMarker,
    styles.root,
    accent === 'danger' && styles.accentDanger,
    accent === 'placeholder' && styles.accentPlaceholder,
    isDisabled && styles.disabled,
    isHoverBackgroundDisabled === true && styles.noTransition,
    backgroundStyles[isHighlighted ? 'highlighted' : 'idle'][hoverBackground],
  ];
};

export const StyledMenuItemBase = forwardRef<
  HTMLDivElement,
  StyledMenuItemBaseElementProps
>(
  (
    {
      accent,
      isKeySelected,
      isHoverBackgroundDisabled,
      hovered: _hovered,
      disabled,
      focused,
      className,
      xstyle,
      children,
      ...rest
    },
    ref,
  ) => (
    <div
      ref={ref}
      {...mergeStylexProps(
        stylex.props(
          getMenuItemBaseStyles({
            accent,
            isKeySelected,
            isHoverBackgroundDisabled,
            disabled,
            focused,
          }),
          xstyle,
        ),
        className,
      )}
      data-accent={accent}
      data-key-selected={isKeySelected || undefined}
      data-hover-background-disabled={isHoverBackgroundDisabled || undefined}
      data-disabled={disabled || undefined}
      data-focused={focused || undefined}
      {...rest}
    >
      {children}
    </div>
  ),
);

StyledMenuItemBase.displayName = 'StyledMenuItemBase';

type StyledStaticDivProps = WithXstyle<ComponentPropsWithoutRef<'div'>>;

const createStyledDiv = (
  style: stylex.StyleXStyles,
  displayName: string,
  classNameHook?: string,
) => {
  const StyledDiv = forwardRef<HTMLDivElement, StyledStaticDivProps>(
    ({ className, xstyle, children, ...rest }, ref) => (
      <div
        ref={ref}
        {...mergeStylexProps(
          stylex.props(style, xstyle),
          [classNameHook, className].filter(isNonEmptyString).join(' '),
        )}
        {...rest}
      >
        {children}
      </div>
    ),
  );

  StyledDiv.displayName = displayName;

  return StyledDiv;
};

export const StyledMenuItemLabel = createStyledDiv(
  styles.label,
  'StyledMenuItemLabel',
);

export const StyledMenuItemLabelLight = createStyledDiv(
  styles.labelLight,
  'StyledMenuItemLabelLight',
);

export const StyledNoIconFiller = createStyledDiv(
  styles.noIconFiller,
  'StyledNoIconFiller',
);

export const StyledMenuItemLeftContent = createStyledDiv(
  styles.leftContent,
  'StyledMenuItemLeftContent',
  'tw-menu-item-content',
);

export const StyledMenuItemRightContent = createStyledDiv(
  styles.rightContent,
  'StyledMenuItemRightContent',
  'tw-menu-item-content',
);

export const StyledDraggableItem = createStyledDiv(
  styles.draggableItem,
  'StyledDraggableItem',
);

export const StyledMenuItemContextualText = createStyledDiv(
  styles.contextualText,
  'StyledMenuItemContextualText',
);

export const StyledRightMenuItemContextualText = createStyledDiv(
  styles.rightContextualText,
  'StyledRightMenuItemContextualText',
);

type HoverableMenuItemBaseProps = {
  isIconDisplayedOnHoverOnly?: boolean;
  cursor?: 'drag' | 'default';
} & MenuItemBaseProps;

type StyledHoverableMenuItemBaseElementProps = WithXstyle<
  HoverableMenuItemBaseProps & ComponentPropsWithoutRef<'div'>
>;

export const StyledHoverableMenuItemBase = forwardRef<
  HTMLDivElement,
  StyledHoverableMenuItemBaseElementProps
>(
  (
    {
      accent,
      isKeySelected,
      isHoverBackgroundDisabled,
      hovered: _hovered,
      disabled,
      focused,
      isIconDisplayedOnHoverOnly,
      cursor,
      className,
      xstyle,
      children,
      ...rest
    },
    ref,
  ) => (
    <div
      ref={ref}
      {...mergeStylexProps(
        stylex.props(
          getMenuItemBaseStyles({
            accent,
            isKeySelected,
            isHoverBackgroundDisabled,
            disabled,
            focused,
          }),
          cursor === 'drag' && styles.dragCursor,
          disabled === true && styles.defaultCursor,
          xstyle,
        ),
        className,
      )}
      data-accent={accent}
      data-key-selected={isKeySelected || undefined}
      data-hover-background-disabled={isHoverBackgroundDisabled || undefined}
      data-disabled={disabled || undefined}
      data-focused={focused || undefined}
      data-icon-displayed-on-hover-only={
        isIconDisplayedOnHoverOnly || undefined
      }
      data-cursor={cursor}
      {...rest}
    >
      {children}
    </div>
  ),
);

StyledHoverableMenuItemBase.displayName = 'StyledHoverableMenuItemBase';

export const StyledMenuItemHoverableButtons = ({
  hoverOnly,
  children,
}: {
  hoverOnly: boolean;
  children: ReactNode;
}) => (
  <StyledMenuItemRightContent
    xstyle={[
      styles.hoverableButtons,
      hoverOnly && styles.hoverableButtonsHoverOnly,
    ]}
  >
    {children}
  </StyledMenuItemRightContent>
);

export const StyledMenuItemIconCheck = ({ size }: { size?: number }) => (
  <div {...stylex.props(styles.iconCheckContainer)}>
    <IconCheck size={size} />
  </div>
);
