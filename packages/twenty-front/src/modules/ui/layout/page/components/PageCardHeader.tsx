import { layoutSize } from '@/ui/layout/constants/layout.stylex';
import { useNavigationDrawerExpanded } from '@/ui/navigation/navigation-drawer/hooks/useNavigationDrawerExpanded';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { useWorkspaceSurfaceHeaderPortal } from '@/ui/layout/hooks/useWorkspaceSurfaceHeaderPortal';
import { Breadcrumb } from '@/ui/navigation/bread-crumb/components/Breadcrumb';
import { type BreadcrumbProps } from '@/ui/navigation/bread-crumb/types/BreadcrumbProps';
import { PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID } from '@/ui/layout/page/constants/PageActionContainerClickOutsideId';
import { NavigationDrawerCollapseButton } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerCollapseButton';
import { useIsMobile } from 'twenty-ui/utilities';
import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type PageCardHeaderProps = {
  links?: BreadcrumbProps['links'];
  breadcrumb?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  tag?: ReactNode;
  actionButton?: ReactNode;
  centerTitle?: boolean;
  titleColor?: string;
};

const styles = stylex.create({
  header: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    boxSizing: 'border-box',
    columnGap: spacing['--t-spacing-2'],
    display: 'grid',
    gridTemplateColumns: 'minmax(0, auto) minmax(min-content, 1fr)',
    minHeight: layoutSize.appHeaderHeight,
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-3'],
    width: '100%',
  },
  headerCentered: {
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)',
  },
  title: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    gap: spacing['--t-spacing-1'],
    minWidth: 0,
  },
  titleColor: (color: string) => ({ color }),
  centeredTitle: {
    gridColumn: 2,
    justifyContent: 'center',
    justifySelf: 'stretch',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  surfaceTitle: {
    overflow: 'hidden',
    width: '100%',
  },
  right: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    gridColumn: 2,
    justifyContent: 'flex-end',
    justifySelf: 'end',
    width: '100%',
  },
  rightCentered: {
    gridColumn: 3,
  },
  left: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    gridColumn: '1',
    minWidth: '0',
    overflow: 'hidden',
    width: '100%',
  },
  surfaceActions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    gap: spacing['--t-spacing-2'],
  },
});

export const PageCardHeader = ({
  links,
  breadcrumb,
  icon,
  title,
  tag,
  actionButton,
  centerTitle = false,
  titleColor,
}: PageCardHeaderProps) => {
  const isMobile = useIsMobile();
  const isNavigationDrawerExpanded = useNavigationDrawerExpanded();
  const workspaceSurface = useWorkspaceSurface();
  const workspaceSurfaceHeaderPortal = useWorkspaceSurfaceHeaderPortal();

  const hasTitleContent = isDefined(icon) || isDefined(title) || isDefined(tag);
  const shouldCenterTitle = centerTitle && hasTitleContent;

  const titleContent = (
    <>
      {icon}
      {isDefined(title) && title}
      {tag}
    </>
  );

  const surfaceTitleContent = isDefined(breadcrumb) ? (
    breadcrumb
  ) : hasTitleContent ? (
    titleContent
  ) : isDefined(links) ? (
    <Breadcrumb links={links} />
  ) : null;

  if (workspaceSurface.type === 'side-panel') {
    return (
      <>
        {isDefined(workspaceSurfaceHeaderPortal.title) &&
          isDefined(surfaceTitleContent) &&
          createPortal(
            <div
              {...stylex.props(
                styles.title,
                styles.surfaceTitle,
                isDefined(titleColor) && styles.titleColor(titleColor),
              )}
            >
              {surfaceTitleContent}
            </div>,
            workspaceSurfaceHeaderPortal.title,
          )}
        {isDefined(workspaceSurfaceHeaderPortal.actions) &&
          isDefined(actionButton) &&
          createPortal(
            <div
              data-click-outside-id={PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID}
              {...stylex.props(styles.surfaceActions)}
            >
              {actionButton}
            </div>,
            workspaceSurfaceHeaderPortal.actions,
          )}
      </>
    );
  }

  return (
    <div
      {...stylex.props(
        styles.header,
        shouldCenterTitle && styles.headerCentered,
      )}
    >
      <div {...stylex.props(styles.left)}>
        {!isMobile && !isNavigationDrawerExpanded && (
          <NavigationDrawerCollapseButton direction="right" />
        )}
        {isDefined(breadcrumb)
          ? breadcrumb
          : isDefined(links) && <Breadcrumb links={links} />}
        {!shouldCenterTitle && hasTitleContent && (
          <div
            {...stylex.props(
              styles.title,
              isDefined(titleColor) && styles.titleColor(titleColor),
            )}
          >
            {titleContent}
          </div>
        )}
      </div>
      {shouldCenterTitle && (
        <div
          {...stylex.props(
            styles.title,
            styles.centeredTitle,
            isDefined(titleColor) && styles.titleColor(titleColor),
          )}
        >
          {titleContent}
        </div>
      )}
      <div
        data-click-outside-id={PAGE_ACTION_CONTAINER_CLICK_OUTSIDE_ID}
        {...stylex.props(
          styles.right,
          shouldCenterTitle && styles.rightCentered,
        )}
      >
        {actionButton}
      </div>
    </div>
  );
};
