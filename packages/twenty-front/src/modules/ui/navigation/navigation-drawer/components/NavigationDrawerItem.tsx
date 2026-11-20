import { type NavigationDrawerItemProps } from '@/ui/navigation/navigation-drawer/types/NavigationDrawerItemProps';
import { VisuallyHidden } from 'twenty-ui/primitives/accessibility';
import { isObject } from '@sniptt/guards';
import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerItemBreadcrumb } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItemBreadcrumb';
import { StyledNavigationDrawerUnreadDot } from '@/ui/navigation/navigation-drawer/components/StyledNavigationDrawerUnreadDot';
import { navigationDrawerItemMarker } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem.stylex';
import { NavigationDrawerItemEditingContext } from '@/ui/navigation/navigation-drawer/contexts/NavigationDrawerItemEditingContext';
import { useNavigationDrawerTooltip } from '@/ui/navigation/navigation-drawer/hooks/useNavigationDrawerTooltip';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { useMouseDownNavigation } from '@/ui/navigation/hooks/useMouseDownNavigation';
import { useIsMobile } from 'twenty-ui/utilities';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { t } from '@lingui/core/macro';
import { type ElementType, type MouseEvent, useContext } from 'react';
import { Link } from 'react-router-dom';
import { isAbsoluteUrl, isDefined } from 'twenty-shared/utils';
import { Badge } from 'twenty-ui/primitives/data-display';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import {
  Shortcut,
  OverflowingTextWithTooltip,
} from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import { openUrlInNewTab } from '~/utils/openUrlInNewTab';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import {
  backgroundTransparent,
  borderRadius,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const DEFAULT_INDENTATION_LEVEL = 1;

const styles = stylex.create({
  item: {
    borderColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    textDecoration: 'none',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    boxSizing: 'border-box',
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    userSelect: 'none',
    minWidth: 0,
    paddingBottom: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
  itemHighlighted: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  selectedInEditMode: {
    borderColor: color['--t-color-blue'],
  },
  colorDefault: {
    color: {
      default: fontColor['--t-font-color-secondary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
  },
  colorActive: {
    color: fontColor['--t-font-color-primary'],
  },
  colorLight: {
    color: fontColor['--t-font-color-light'],
  },
  colorTertiary: {
    color: fontColor['--t-font-color-tertiary'],
  },
  cursorPointer: {
    cursor: 'pointer',
  },
  cursorDefault: {
    cursor: 'default',
  },
  cursorGrabbing: {
    cursor: 'grabbing',
  },
  heightExpanded: {
    height: {
      default: spacing['--t-spacing-7'],
      [media.mobile]: spacing['--t-spacing-8'],
    },
  },
  heightCollapsed: {
    height: spacing['--t-spacing-8'],
  },
  indentationLevelTwo: {
    marginTop: '2px',
  },
  paddingExpanded: {
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
  },
  paddingExpandedWithRightOptions: {
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-0_5'],
  },
  paddingCollapsed: {
    paddingLeft: `calc(${spacing['--t-spacing-2']} - 1px)`,
    paddingRight: spacing['--t-spacing-1'],
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  widthExpanded: {
    width: `calc(100% - ${spacing['--t-spacing-1_5']} + ${spacing['--t-spacing-1']} + ${spacing['--t-spacing-1']})`,
  },
  widthExpandedWithRightOptions: {
    width: `calc(100% - ${spacing['--t-spacing-1_5']} + ${spacing['--t-spacing-1']} + ${spacing['--t-spacing-0_5']})`,
  },
  widthCollapsed: {
    width: spacing['--t-spacing-8'],
  },
  itemElementsContainer: {
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  },
  labelParent: {
    flex: '1 1 auto',
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    textOverflow: 'clip',
    whiteSpace: 'nowrap',
    minWidth: '0px',
  },
  itemLabel: {
    color: 'inherit',
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  itemLabelUnread: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  itemSecondaryLabel: {
    color: fontColor['--t-font-color-light'],
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  navigationDrawerItemContainer: {
    display: 'flex',
    width: '100%',
  },
  spacer: {
    flexGrow: '1',
  },
  icon: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: '0',
    flexShrink: '0',
    justifyContent: 'center',
    position: 'relative',
    marginRight: spacing['--t-spacing-2'],
  },
  rightOptionsContainer: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: '0',
    flexShrink: '0',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    height: spacing['--t-spacing-6'],
  },
  rightOptionsVisibility: {
    overflow: {
      default: 'hidden',
      [stylex.when.ancestor(':hover', navigationDrawerItemMarker)]: 'visible',
      [stylex.when.ancestor(':focus-within', navigationDrawerItemMarker)]:
        'visible',
    },
    clipPath: {
      default: 'inset(1px)',
      [stylex.when.ancestor(':hover', navigationDrawerItemMarker)]: 'none',
      [stylex.when.ancestor(':focus-within', navigationDrawerItemMarker)]:
        'none',
    },
    display: {
      default: 'block',
      [stylex.when.ancestor(':hover', navigationDrawerItemMarker)]: 'flex',
      [stylex.when.ancestor(':focus-within', navigationDrawerItemMarker)]:
        'flex',
    },
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', navigationDrawerItemMarker)]: 1,
      [stylex.when.ancestor(':focus-within', navigationDrawerItemMarker)]: 1,
    },
    position: {
      default: 'absolute',
      [stylex.when.ancestor(':hover', navigationDrawerItemMarker)]: 'static',
      [stylex.when.ancestor(':focus-within', navigationDrawerItemMarker)]:
        'static',
    },
    transitionDuration: '150ms',
    transitionProperty: 'opacity',
    whiteSpace: 'nowrap',
    height: {
      default: '1px',
      [stylex.when.ancestor(':hover', navigationDrawerItemMarker)]: 'auto',
      [stylex.when.ancestor(':focus-within', navigationDrawerItemMarker)]:
        'auto',
    },
    paddingLeft: spacing['--t-spacing-2'],
    width: {
      default: '1px',
      [stylex.when.ancestor(':hover', navigationDrawerItemMarker)]: 'auto',
      [stylex.when.ancestor(':focus-within', navigationDrawerItemMarker)]:
        'auto',
    },
  },
  rightOptionsVisible: {
    overflow: 'visible',
    clipPath: 'none',
    display: 'flex',
    opacity: 1,
    position: 'static',
    height: 'auto',
    width: 'auto',
  },
});

export const NavigationDrawerItem = ({
  className,
  label,
  secondaryLabel,
  indentationLevel = DEFAULT_INDENTATION_LEVEL,
  Icon,
  to,
  onClick,
  active,
  modifier,
  subItemState,
  rightOptions,
  alwaysShowRightOptions = false,
  isDragging,
  isRightOptionsDropdownOpen,
  triggerEvent,
  preventCollapseOnMobile = false,
  isSelectedInEditMode = false,
  variant = 'default',
  isUnread = false,
}: NavigationDrawerItemProps) => {
  const theme = useTheme();
  const editingContent = useContext(NavigationDrawerItemEditingContext);
  const isMobile = useIsMobile();
  const isExpanded = useIsNavigationDrawerContentExpanded();
  const setIsNavigationDrawerExpanded = useSetAtomState(
    isNavigationDrawerExpandedState,
  );

  const { navigationItemId } = useNavigationDrawerTooltip(label, to);

  const isSoon = modifier === 'soon';
  const isNew = modifier === 'new';
  const keyboardKeys = isObject(modifier) ? modifier.keyboard : undefined;

  const showBreadcrumb = indentationLevel === 2;
  const showStyledSpacer = isDefined(modifier) || isDefined(rightOptions);
  const hasRightOptions = isDefined(rightOptions);
  const isPlaceholder = variant === 'placeholder';

  const handleMobileNavigation = () => {
    if (isMobile && !preventCollapseOnMobile) {
      setIsNavigationDrawerExpanded(false);
    }
  };

  const isExternalLink = isDefined(to) && isAbsoluteUrl(to);
  const isInternalLink = isDefined(to) && !isExternalLink;

  const handleExternalLinkClick = () => {
    handleMobileNavigation();
    if (isDefined(to)) {
      openUrlInNewTab(to);
    }
  };

  const {
    onClick: handleMouseDownNavigationClickClick,
    onMouseDown: handleMouseDown,
  } = useMouseDownNavigation({
    to: isExternalLink ? undefined : to,
    onClick: isExternalLink ? (onClick ?? handleExternalLinkClick) : onClick,
    onBeforeNavigation: handleMobileNavigation,
    triggerEvent,
  });

  const ItemElement: ElementType = editingContent
    ? 'div'
    : isExternalLink
      ? 'a'
      : isInternalLink
        ? Link
        : isDefined(rightOptions)
          ? 'div'
          : 'button';

  const colorStyle = isPlaceholder
    ? styles.colorLight
    : variant === 'tertiary'
      ? styles.colorTertiary
      : active === true
        ? styles.colorActive
        : isSoon
          ? styles.colorLight
          : styles.colorDefault;

  const itemProps = stylex.props(
    navigationDrawerItemMarker,
    styles.item,
    (active || isPlaceholder) && styles.itemHighlighted,
    (isSelectedInEditMode || editingContent?.isSelected) &&
      styles.selectedInEditMode,
    colorStyle,
    isDragging
      ? styles.cursorGrabbing
      : isSoon
        ? styles.cursorDefault
        : styles.cursorPointer,
    isExpanded ? styles.heightExpanded : styles.heightCollapsed,
    indentationLevel === 2 && styles.indentationLevelTwo,
    !isExpanded
      ? styles.paddingCollapsed
      : hasRightOptions
        ? styles.paddingExpandedWithRightOptions
        : styles.paddingExpanded,
    (isSoon || isPlaceholder) && styles.pointerEventsNone,
    !isExpanded
      ? styles.widthCollapsed
      : hasRightOptions
        ? styles.widthExpandedWithRightOptions
        : styles.widthExpanded,
  );

  return (
    <div {...stylex.props(styles.navigationDrawerItemContainer)}>
      <Tooltip
        content={label}
        side="right"
        delay={TooltipDelay.noDelay}
        positionMethod="fixed"
        disabled={isExpanded || isMobile}
      >
        <ItemElement
          id={navigationItemId}
          {...itemProps}
          className={['navigation-drawer-item', itemProps.className, className]
            .filter(isDefined)
            .join(' ')}
          onClick={(event: MouseEvent<HTMLElement>) => {
            if (
              !(event.target instanceof Node) ||
              !event.currentTarget.contains(event.target)
            ) {
              return;
            }
            handleMouseDownNavigationClickClick(event);
          }}
          onMouseDown={(event: MouseEvent<HTMLElement>) => {
            if (
              !(event.target instanceof Node) ||
              !event.currentTarget.contains(event.target)
            ) {
              return;
            }
            handleMouseDown(event);
          }}
          aria-current={active ? (isDefined(to) ? 'page' : true) : undefined}
          disabled={isPlaceholder}
          role={
            !isDefined(editingContent) && !to && isDefined(rightOptions)
              ? 'button'
              : undefined
          }
          to={isInternalLink ? to : undefined}
          href={isExternalLink ? to : undefined}
          target={isExternalLink ? '_blank' : undefined}
          rel={isExternalLink ? 'noopener noreferrer' : undefined}
          draggable={isInternalLink ? false : undefined}
        >
          <div {...stylex.props(styles.itemElementsContainer)}>
            {showBreadcrumb && (
              <NavigationDrawerAnimatedCollapseWrapper>
                <NavigationDrawerItemBreadcrumb state={subItemState} />
              </NavigationDrawerAnimatedCollapseWrapper>
            )}

            {editingContent ? (
              <div {...stylex.props(styles.icon)}>{editingContent.icon}</div>
            ) : (
              isDefined(Icon) && (
                <div {...stylex.props(styles.icon)}>
                  <Icon
                    size={theme.icon.size.md}
                    stroke={theme.icon.stroke.md}
                    color={
                      showBreadcrumb && !isExpanded
                        ? theme.font.color.light
                        : 'currentColor'
                    }
                  />
                  {isUnread && !isExpanded && (
                    <StyledNavigationDrawerUnreadDot />
                  )}
                </div>
              )
            )}

            <div {...stylex.props(styles.labelParent)}>
              {editingContent?.label ?? (
                <OverflowingTextWithTooltip
                  text={
                    <>
                      <span
                        {...stylex.props(
                          styles.itemLabel,
                          isUnread && styles.itemLabelUnread,
                        )}
                      >
                        {label}
                        {isUnread && (
                          <VisuallyHidden>{t`, unread`}</VisuallyHidden>
                        )}
                      </span>
                      {secondaryLabel && (
                        <span {...stylex.props(styles.itemSecondaryLabel)}>
                          {' · '}
                          {secondaryLabel}
                        </span>
                      )}
                    </>
                  }
                  tooltipContent={
                    secondaryLabel ? `${label} · ${secondaryLabel}` : label
                  }
                />
              )}
            </div>

            {showStyledSpacer && <span {...stylex.props(styles.spacer)} />}

            {isSoon && (
              <NavigationDrawerAnimatedCollapseWrapper>
                <Badge>{t`Soon`}</Badge>
              </NavigationDrawerAnimatedCollapseWrapper>
            )}

            {isNew && (
              <NavigationDrawerAnimatedCollapseWrapper>
                <Badge>{t`New`}</Badge>
              </NavigationDrawerAnimatedCollapseWrapper>
            )}

            {isDefined(keyboardKeys) && (
              <NavigationDrawerAnimatedCollapseWrapper>
                <Shortcut shortcut={keyboardKeys} sequenceJoinLabel={t`then`} />
              </NavigationDrawerAnimatedCollapseWrapper>
            )}

            {isDefined(rightOptions) && (
              <NavigationDrawerAnimatedCollapseWrapper>
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClickCapture={(event) => {
                    const isClickInsideLinkedOptions =
                      isDefined(to) &&
                      event.target instanceof Node &&
                      event.currentTarget.contains(event.target);

                    if (isClickInsideLinkedOptions) {
                      event.preventDefault();
                    }
                  }}
                  {...stylex.props(styles.rightOptionsContainer)}
                >
                  <div
                    {...stylex.props(
                      styles.rightOptionsVisibility,
                      (isMobile ||
                        isRightOptionsDropdownOpen ||
                        alwaysShowRightOptions) &&
                        styles.rightOptionsVisible,
                    )}
                  >
                    {rightOptions}
                  </div>
                </div>
              </NavigationDrawerAnimatedCollapseWrapper>
            )}
          </div>
        </ItemElement>
      </Tooltip>
    </div>
  );
};
