import { type MessageFolder } from '@/accounts/types/MessageFolder';
import { getToastOptionsFromError } from '@/error-handler/utils/getToastOptionsFromError';
import { SettingsMessageFoldersEmptyStateCard } from '@/settings/accounts/components/message-folders/SettingsMessageFoldersEmptyStateCard';
import { SettingsMessageFoldersSkeletonLoader } from '@/settings/accounts/components/message-folders/SettingsMessageFoldersSkeletonLoader';
import { SettingsMessageFoldersTreeItem } from '@/settings/accounts/components/message-folders/SettingsMessageFoldersTreeItem';
import { computeMessageFolderTree } from '@/settings/accounts/components/message-folders/utils/computeMessageFolderTree';
import { computeToggleAllFoldersState } from '@/settings/accounts/components/message-folders/utils/computeToggleAllFoldersState';
import { useMyMessageFolders } from '@/settings/accounts/hooks/useMyMessageFolders';
import { useUpdateMessageFoldersSyncStatus } from '@/settings/accounts/hooks/useUpdateMessageFoldersSyncStatus';
import { settingsAccountsSelectedMessageChannelState } from '@/settings/accounts/states/settingsAccountsSelectedMessageChannelState';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useToast } from 'twenty-ui/components/feedback';
import { Section } from 'twenty-ui/components/layout';
import { Checkbox } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  displayLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  treeList: {
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
  foldersContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  searchInputContainer: {
    marginBottom: spacing['--t-spacing-2'],
    width: '100%',
  },
  sectionHeader: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    textAlign: 'left',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    height: spacing['--t-spacing-6'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  labelContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    marginBottom: spacing['--t-spacing-2'],
    marginTop: spacing['--t-spacing-2'],
  },
});

export const SettingsAccountsMessageFoldersCard = () => {
  const { t } = useLingui();
  const [search, setSearch] = useState('');

  const { enqueueToast } = useToast();

  const settingsAccountsSelectedMessageChannel = useAtomStateValue(
    settingsAccountsSelectedMessageChannelState,
  );

  const { updateMessageFoldersSyncStatus } =
    useUpdateMessageFoldersSyncStatus();

  const { messageFolders, loading } = useMyMessageFolders(
    settingsAccountsSelectedMessageChannel?.id,
  );

  const filteredMessageFolders = useMemo(() => {
    return messageFolders.filter((folder) =>
      folder.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [messageFolders, search]);

  const folderTreeNodes = useMemo(() => {
    return computeMessageFolderTree(filteredMessageFolders);
  }, [filteredMessageFolders]);

  const { allSynced, messageFolderIds, targetSyncState } = useMemo(
    () => computeToggleAllFoldersState(messageFolders),
    [messageFolders],
  );

  const handleToggleAllFolders = async () => {
    if (messageFolderIds.length === 0) return;

    try {
      await updateMessageFoldersSyncStatus({
        messageFolderIds,
        isSynced: targetSyncState,
      });
    } catch (error) {
      enqueueToast(getToastOptionsFromError({ error }));
    }
  };

  const handleToggleFolder = async (folderToToggle: MessageFolder) => {
    const isSynced = !folderToToggle.isSynced;

    try {
      await updateMessageFoldersSyncStatus({
        messageFolderIds: [folderToToggle.id],
        isSynced,
      });
    } catch (error) {
      enqueueToast(getToastOptionsFromError({ error }));
    }
  };

  if (loading) {
    return (
      <Section.Root>
        <Table>
          <SettingsMessageFoldersSkeletonLoader />
        </Table>
      </Section.Root>
    );
  }

  if (messageFolders.length === 0) {
    return <SettingsMessageFoldersEmptyStateCard />;
  }

  return (
    <Section.Root>
      <Table>
        <div {...stylex.props(styles.searchInputContainer)}>
          <SettingsTextInput
            placeholder={t`Search folders...`}
            value={search}
            onChange={setSearch}
            instanceId={'message-folders-search'}
          />
        </div>
        <span {...stylex.props(styles.labelContainer)}>
          <Text {...stylex.props(styles.displayLabel)}>{t`Folders`}</Text>
        </span>

        <div {...stylex.props(styles.sectionHeader)}>
          <Text {...stylex.props(styles.displayLabel)}>
            {t`Toggle all folders`}
          </Text>
          <TableCell
            align="right"
            padding={`0 ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[2]}`}
          >
            <Checkbox
              checked={allSynced}
              onCheckedChange={() => handleToggleAllFolders()}
              size={'sm'}
            />
          </TableCell>
        </div>

        <div {...stylex.props(styles.foldersContainer)}>
          <ul {...stylex.props(styles.treeList)}>
            {folderTreeNodes.map((rootFolder) => (
              <SettingsMessageFoldersTreeItem
                key={rootFolder.folder.id}
                folderTreeNode={rootFolder}
                onToggleFolder={handleToggleFolder}
              />
            ))}
          </ul>
        </div>
      </Table>
    </Section.Root>
  );
};
