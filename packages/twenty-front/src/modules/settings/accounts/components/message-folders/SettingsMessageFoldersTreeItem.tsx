import { type MessageFolder } from '@/accounts/types/MessageFolder';
import { SettingsAccountsMessageFolderIcon } from '@/settings/accounts/components/message-folders/SettingsAccountsMessageFolderIcon';
import { SettingsMessageFoldersBreadcrumb } from '@/settings/accounts/components/message-folders/SettingsMessageFoldersBreadcrumb';
import { type MessageFolderTreeNode } from '@/settings/accounts/components/message-folders/utils/computeMessageFolderTree';
import { countNestedFolders } from '@/settings/accounts/components/message-folders/utils/countNestedFolders';
import { formatFolderName } from '@/settings/accounts/components/message-folders/utils/formatFolderName';
import { isFolderTreePartiallySelected } from '@/settings/accounts/components/message-folders/utils/isFolderTreePartiallySelected';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { MessageFolderPendingSyncAction } from 'twenty-shared/types';
import { Status } from 'twenty-ui/primitives/data-display';
import { Checkbox } from 'twenty-ui/primitives/input';
import { IconChevronDown, IconChevronUp } from 'twenty-ui/icon';

import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsMessageFoldersTreeItemProps = {
  depth?: number;
  folderTreeNode: MessageFolderTreeNode;
  isLast?: boolean;
  onToggleFolder: (folder: MessageFolder) => void;
  parentsIsLastList?: boolean[];
};

const BREADCRUMB_WIDTH = 24;

const styles = stylex.create({
  collapsibleWrapper: {
    display: 'grid',
    gridTemplateRows: '0fr',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'grid-template-rows',
    transitionTimingFunction: 'ease-out',
  },
  collapsibleWrapperExpanded: {
    gridTemplateRows: '1fr',
  },
  treeItemContent: (depth: number) => ({
    borderRadius: borderRadius['--t-border-radius-sm'],
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-lighter'],
    },
    cursor: 'pointer',
    display: 'flex',
    paddingInlineStart: `${depth * BREADCRUMB_WIDTH}px`,
    transitionDuration: `calc(${animationDuration['--t-animation-duration-instant']} * 1s)`,
    transitionProperty: 'background-color',
    userSelect: 'none',
    height: '28px',
  }),
  treeItem: {
    position: 'relative',
  },
  nestedList: {
    listStyle: 'none',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
  },
  collapsibleContent: {
    overflow: 'hidden',
  },
  folderContent: {
    flex: '1',
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
  },
  folderInfo: {
    flex: '1',
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  folderName: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rightSection: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    marginLeft: 'auto',
  },
  childCount: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    textAlign: 'right',
    minWidth: spacing['--t-spacing-3'],
  },
  expandButton: {
    background: 'none',
    borderStyle: 'none',
    alignItems: 'center',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    height: spacing['--t-spacing-4'],
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
    width: spacing['--t-spacing-4'],
  },
  checkboxWrapper: {
    alignItems: 'center',
    display: 'flex',
  },
});

export const SettingsMessageFoldersTreeItem = ({
  depth = 0,
  folderTreeNode,
  isLast = false,
  onToggleFolder,
  parentsIsLastList = [],
}: SettingsMessageFoldersTreeItemProps) => {
  const { t } = useLingui();
  const [isExpanded, setIsExpanded] = useState(true);

  const { children, folder, hasChildren } = folderTreeNode;
  const childCount = hasChildren ? countNestedFolders(folderTreeNode) : 0;
  const isIndeterminate =
    hasChildren &&
    !folder.isSynced &&
    isFolderTreePartiallySelected(folderTreeNode);

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleRowClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const childParentsIsLastList =
    depth > 0 ? [...parentsIsLastList, isLast] : parentsIsLastList;

  return (
    <li {...stylex.props(styles.treeItem)}>
      <div
        {...stylex.props(styles.treeItemContent(depth))}
        onClick={handleRowClick}
      >
        {depth > 0 && (
          <SettingsMessageFoldersBreadcrumb
            depth={depth}
            isLast={isLast}
            parentsIsLastList={parentsIsLastList}
          />
        )}

        <div {...stylex.props(styles.folderContent)}>
          <div {...stylex.props(styles.folderInfo)}>
            <SettingsAccountsMessageFolderIcon
              folder={folder}
              isChildFolder={depth > 0}
            />
            <span {...stylex.props(styles.folderName)}>
              {formatFolderName(folder.name)}
            </span>
          </div>

          <div {...stylex.props(styles.rightSection)}>
            {folder.pendingSyncAction ===
              MessageFolderPendingSyncAction.FOLDER_IMPORT && (
              <Status color="turquoise" loading>{t`Importing`}</Status>
            )}

            {hasChildren && (
              <>
                <span {...stylex.props(styles.childCount)}>{childCount}</span>
                <button
                  aria-label={
                    isExpanded ? t`Collapse folder` : t`Expand folder`
                  }
                  onClick={handleExpandToggle}
                  {...stylex.props(styles.expandButton)}
                >
                  {isExpanded ? (
                    <IconChevronUp size={16} />
                  ) : (
                    <IconChevronDown size={16} />
                  )}
                </button>
              </>
            )}

            <div
              onClick={handleCheckboxClick}
              {...stylex.props(styles.checkboxWrapper)}
            >
              <Checkbox
                checked={folder.isSynced}
                indeterminate={isIndeterminate}
                onCheckedChange={() => onToggleFolder(folder)}
                size={'sm'}
              />
            </div>
          </div>
        </div>
      </div>

      {hasChildren && (
        <div
          {...stylex.props(
            styles.collapsibleWrapper,
            isExpanded && styles.collapsibleWrapperExpanded,
          )}
        >
          <div {...stylex.props(styles.collapsibleContent)}>
            <ul {...stylex.props(styles.nestedList)}>
              {children.map((child, index) => (
                <SettingsMessageFoldersTreeItem
                  key={child.folder.id}
                  depth={depth + 1}
                  folderTreeNode={child}
                  isLast={index === children.length - 1}
                  onToggleFolder={onToggleFolder}
                  parentsIsLastList={childParentsIsLastList}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
};
