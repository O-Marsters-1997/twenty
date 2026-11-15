import { Fragment } from 'react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconLink, IconLock, IconRefresh, IconUsers } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { RecordSharingAccessLevelOptions } from '@/object-record/record-sharing/components/RecordSharingAccessLevelOptions';
import { type useRecordSharing } from '@/object-record/record-sharing/hooks/useRecordSharing';
import { getRecordShareAccessLevelLabel } from '@/object-record/record-sharing/utils/getRecordShareAccessLevelLabel';
import { getRecordShareLabel } from '@/object-record/record-sharing/utils/getRecordShareLabel';
import { getRecordShareRoleAccessNote } from '@/object-record/record-sharing/utils/getRecordShareRoleAccessNote';
import { SidePanelGroup } from '@/side-panel/components/SidePanelGroup';
import { SidePanelList } from '@/side-panel/components/SidePanelList';
import { SidePanelShareRecordAddPeopleItem } from '@/side-panel/pages/share-record/components/SidePanelShareRecordAddPeopleItem';
import { SidePanelShareRecordDropdownItem } from '@/side-panel/pages/share-record/components/SidePanelShareRecordDropdownItem';
import { SidePanelShareRecordGeneralAccessItem } from '@/side-panel/pages/share-record/components/SidePanelShareRecordGeneralAccessItem';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import {
  ObjectSharingReach,
  RecordSharePrincipalType,
  RecordShareRowCause,
  RecordSharingMode,
} from '~/generated-metadata/graphql';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const ADD_PEOPLE_ITEM_ID = 'share-record-add-people';
const GENERAL_ACCESS_ITEM_ID = 'share-record-general-access';
const RETRY_ITEM_ID = 'share-record-retry';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  listContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  description: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: 1.5,
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-1'],
    whiteSpace: 'normal',
  },
  roleAccessNote: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-8'],
  },
});

type SidePanelShareRecordContentProps = {
  recordUrl: string;
  objectLabelPlural: string;
  sharingReach: ObjectSharingReach;
  sharingState: ReturnType<typeof useRecordSharing>;
};

export const SidePanelShareRecordContent = ({
  recordUrl,
  objectLabelPlural,
  sharingReach,
  sharingState,
}: SidePanelShareRecordContentProps) => {
  const { t } = useLingui();
  const {
    sharing,
    loading,
    error,
    saving,
    setGeneralAccess,
    setShare,
    removeShare,
    refetch,
  } = sharingState;
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { copyToClipboard } = useCopyToClipboard();
  const canManageSharing = sharing?.canManageSharing ?? false;
  const roles = sharing?.roles ?? [];
  const recipients = (sharing?.shares ?? []).map((share) => {
    const isRole = share.principalType === RecordSharePrincipalType.ROLE;
    const principalRoleId = isRole ? share.principalId : share.principalRoleId;

    return {
      share,
      label: getRecordShareLabel({
        share,
        member: currentWorkspaceMembers.find(
          (member) => member.id === share.principalId,
        ),
        role: roles.find((role) => role.id === share.principalId),
        currentWorkspaceMember,
      }),
      Icon: isRole ? IconLock : IconUsers,
      principal: isRole
        ? { roleId: share.principalId }
        : { workspaceMemberId: share.principalId },
      principalRole: roles.find((role) => role.id === principalRoleId),
      isEditable: share.rowCause === RecordShareRowCause.MANUAL,
    };
  });

  const selectableItemIds = isDefined(error)
    ? [RETRY_ITEM_ID]
    : canManageSharing
      ? [
          ADD_PEOPLE_ITEM_ID,
          GENERAL_ACCESS_ITEM_ID,
          ...recipients
            .filter((recipient) => recipient.isEditable)
            .map((recipient) => recipient.share.id),
        ]
      : [];

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.listContainer)}>
        <SidePanelList selectableItemIds={selectableItemIds} loading={loading}>
          {isDefined(error) ? (
            <>
              <div
                role="alert"
                {...stylex.props(styles.description)}
              >{t`Sharing settings could not be loaded.`}</div>
              <SelectableListItem
                itemId={RETRY_ITEM_ID}
                onEnter={() => {
                  void refetch().catch(() => {});
                }}
              >
                <CommandMenuItem
                  id={RETRY_ITEM_ID}
                  label={t`Try again`}
                  Icon={IconRefresh}
                  onClick={() => {
                    void refetch().catch(() => {});
                  }}
                />
              </SelectableListItem>
            </>
          ) : (
            isDefined(sharing) &&
            (canManageSharing ? (
              <>
                <SidePanelShareRecordAddPeopleItem
                  itemId={ADD_PEOPLE_ITEM_ID}
                  sharing={sharing}
                  saving={saving}
                  setShare={setShare}
                />
                <SidePanelGroup heading={t`General access`}>
                  <SidePanelShareRecordGeneralAccessItem
                    itemId={GENERAL_ACCESS_ITEM_ID}
                    generalAccessLevel={sharing.generalAccessLevel}
                    defaultGeneralAccessLevel={
                      sharing.defaultGeneralAccessLevel
                    }
                    hasManagedGeneralAccess={sharing.hasManagedGeneralAccess}
                    objectLabelPlural={objectLabelPlural}
                    saving={saving}
                    setGeneralAccess={setGeneralAccess}
                  />
                </SidePanelGroup>
                <SidePanelGroup heading={t`People and roles with access`}>
                  {recipients.map(
                    ({
                      share,
                      label,
                      Icon,
                      principal,
                      principalRole,
                      isEditable,
                    }) => {
                      const roleAccessNote = getRecordShareRoleAccessNote({
                        accessLevel: share.accessLevel,
                        principalRole,
                        sharingReach,
                        objectLabelPlural,
                      });

                      return (
                        <Fragment key={share.id}>
                          {isEditable ? (
                            <SidePanelShareRecordDropdownItem
                              itemId={share.id}
                              label={label}
                              Icon={Icon}
                              description={getRecordShareAccessLevelLabel(
                                share.accessLevel,
                              )}
                              disabled={saving}
                            >
                              <RecordSharingAccessLevelOptions
                                value={share.accessLevel}
                                onChange={(accessLevel) => {
                                  void setShare({ principal, accessLevel });
                                }}
                                onRemove={() => {
                                  void removeShare({ principal });
                                }}
                              />
                            </SidePanelShareRecordDropdownItem>
                          ) : (
                            <CommandMenuItem
                              id={share.id}
                              label={label}
                              Icon={Icon}
                              description={
                                share.rowCause === RecordShareRowCause.OWNER
                                  ? t`Owner`
                                  : t`Managed access`
                              }
                              contextualTextPosition="right"
                              disabled
                            />
                          )}
                          {isDefined(roleAccessNote) && (
                            <div {...stylex.props(styles.roleAccessNote)}>
                              {roleAccessNote}
                            </div>
                          )}
                        </Fragment>
                      );
                    },
                  )}
                </SidePanelGroup>
                <div {...stylex.props(styles.description)}>
                  {sharing.hasManagedGeneralAccess
                    ? t`Workspace access is also managed by an application.`
                    : sharing.sharingMode === RecordSharingMode.INHERITED
                      ? t`Access is also inherited from related records.`
                      : sharingReach === ObjectSharingReach.WORKSPACE
                        ? t`People you add get this record even if their role can't access ${objectLabelPlural}. Field permissions still apply.`
                        : t`Role and field permissions still apply.`}
                </div>
              </>
            ) : (
              <div {...stylex.props(styles.description)}>
                {sharing.sharingMode === RecordSharingMode.ROLE_ONLY
                  ? t`Access to ${objectLabelPlural} is set by roles, not record by record.`
                  : sharing.sharingMode === RecordSharingMode.OPEN_BY_DEFAULT
                    ? t`Only the creator of this record, people with full access to it and admins can change who has access.`
                    : t`Only the creator of this record and people with full access to it can change who has access.`}
              </div>
            ))
          )}
        </SidePanelList>
      </div>
      <SidePanelFooter
        actions={[
          <Button
            key="copy-link"
            size="sm"
            variant="outline"
            startIcon={<IconLink />}
            onClick={() => {
              void copyToClipboard(recordUrl);
            }}
          >{t`Copy link`}</Button>,
        ]}
      />
    </div>
  );
};
