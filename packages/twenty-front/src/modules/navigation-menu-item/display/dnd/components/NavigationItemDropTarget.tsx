import * as stylex from '@stylexjs/stylex';
import { type NavigationDrawerSubItemState } from '@/ui/navigation/navigation-drawer/types/NavigationDrawerSubItemState';
import { NavigationMenuItemInsertionPreview } from '@/navigation-menu-item/edit/components/NavigationMenuItemInsertionPreview';
import { type ReactNode, useContext } from 'react';
import {
  backgroundTransparent,
  borderRadius,
  color,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { type NavigationSections } from '@/navigation-menu-item/common/constants/NavigationSections';
import { NavigationDropTargetContext } from '@/navigation-menu-item/common/contexts/NavigationDropTargetContext';

const styles = stylex.create({
  dropTarget: {
    minHeight: spacing['--t-spacing-2'],
    position: 'relative',
    transitionDuration: '150ms',
    transitionProperty: 'all',
    transitionTimingFunction: 'ease-in-out',
  },
  compact: { minHeight: 0 },
  dragOver: {
    backgroundColor: backgroundTransparent['--t-background-transparent-blue'],
    '::before': {
      backgroundColor: color['--t-color-blue'],
      content: '""',
      height: '2px',
      left: 0,
      position: 'absolute',
      width: '100%',
    },
  },
  highlightTop: {
    '::before': {
      borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
      borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
      top: 0,
    },
  },
  highlightBottom: {
    '::before': {
      borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
      borderTopRightRadius: borderRadius['--t-border-radius-sm'],
      bottom: 0,
    },
  },
  forbidden: { cursor: 'not-allowed' },
});

type NavigationItemDropTargetProps = {
  folderId: string | null;
  index: number;
  sectionId: NavigationSections;
  children?: ReactNode;
  compact?: boolean;
  dropTargetIdOverride?: string;
  highlightPosition?: 'top' | 'bottom';
  previewSubItemState?: NavigationDrawerSubItemState;
};

export const NavigationItemDropTarget = ({
  folderId,
  index,
  sectionId,
  children,
  compact = false,
  dropTargetIdOverride,
  highlightPosition = 'bottom',
  previewSubItemState,
}: NavigationItemDropTargetProps) => {
  const { activeDropTargetId, forbiddenDropTargetId } = useContext(
    NavigationDropTargetContext,
  );
  const dropTargetId =
    dropTargetIdOverride ?? `${sectionId}-${folderId ?? 'orphan'}-${index}`;
  const isDragOver = activeDropTargetId === dropTargetId;
  const isDropForbidden = forbiddenDropTargetId === dropTargetId;

  return (
    <div
      {...stylex.props(
        styles.dropTarget,
        compact && styles.compact,
        isDragOver && !isDropForbidden && styles.dragOver,
        isDragOver &&
          !isDropForbidden &&
          (highlightPosition === 'top'
            ? styles.highlightTop
            : styles.highlightBottom),
        isDropForbidden && styles.forbidden,
      )}
    >
      <NavigationMenuItemInsertionPreview
        folderId={folderId}
        index={index}
        sectionId={sectionId}
        subItemState={previewSubItemState}
      />
      {children}
    </div>
  );
};
