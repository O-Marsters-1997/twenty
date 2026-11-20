import { ToastOnQueryErrorEffect } from '@/apollo/components/ToastOnQueryErrorEffect';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { SettingsRolesQueryEffect } from '@/settings/roles/components/SettingsRolesQueryEffect';
import { useSettingsAllRoles } from '@/settings/roles/hooks/useSettingsAllRoles';
import { SettingsApprovedAccessDomainsListCard } from '@/settings/security/components/approvedAccessDomains/SettingsApprovedAccessDomainsListCard';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useDeleteWorkspaceInvitation } from '@/workspace-invitation/hooks/useDeleteWorkspaceInvitation';
import { useResendWorkspaceInvitation } from '@/workspace-invitation/hooks/useResendWorkspaceInvitation';
import { WorkspaceInviteLink } from '@/workspace/components/WorkspaceInviteLink';
import { WorkspaceInviteTeam } from '@/workspace/components/WorkspaceInviteTeam';
import { useQuery } from '@apollo/client/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyArray } from '@sniptt/guards';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { IconButton } from 'twenty-ui/components/input';
import { Section } from 'twenty-ui/components/layout';
import { IconMail, IconReload, IconTrash } from 'twenty-ui/icon';
import { Status } from 'twenty-ui/primitives/data-display';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import { GetWorkspaceInvitationsDocument } from '~/generated-metadata/graphql';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  buttonContainer: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexShrink: '0',
    marginLeft: spacing['--t-spacing-2'],
  },
  expiresInHeader: {
    whiteSpace: 'nowrap',
  },
  iconWrapper: {
    alignItems: 'center',
    display: 'flex',
    marginRight: spacing['--t-spacing-2'],
  },
  textContainerWithEllipsis: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  table: {
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  tableRows: {
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const SettingsWorkspaceMembersInviteTab = () => {
  const theme = useTheme();
  const { t } = useLingui();
  const { enqueueToast } = useToast();
  const roles = useSettingsAllRoles();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);

  const rolesById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles],
  );

  const { resendInvitation } = useResendWorkspaceInvitation();
  const { deleteWorkspaceInvitation } = useDeleteWorkspaceInvitation();

  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  const { data: invitationsData, error: invitationsError } = useQuery(
    GetWorkspaceInvitationsDocument,
  );

  const workspaceInvitations = invitationsData?.findWorkspaceInvitations ?? [];

  const handleRemoveWorkspaceInvitation = async (appTokenId: string) => {
    const result = await deleteWorkspaceInvitation({ appTokenId });
    if (isDefined(result.error)) {
      enqueueToast({
        status: 'error',
        children: t`Error deleting invitation`,
        duration: 2000,
      });
    }
  };

  const handleResendWorkspaceInvitation = async (appTokenId: string) => {
    const result = await resendInvitation({ appTokenId });
    if (isDefined(result.error)) {
      enqueueToast({
        status: 'error',
        children: t`Error resending invitation`,
        duration: 2000,
      });
    }
  };

  const getExpiresAtText = (expiresAt: string) => {
    const expirationDate = new Date(expiresAt);
    if (expirationDate.getTime() <= Date.now()) return t`Expired`;
    return formatDistanceToNow(expirationDate, { locale: localeCatalog });
  };

  return (
    <>
      <ToastOnQueryErrorEffect error={invitationsError} />

      <SettingsRolesQueryEffect />
      {currentWorkspace?.inviteHash &&
        currentWorkspace?.isPublicInviteLinkEnabled && (
          <Section.Root>
            <Section.Header
              title={t`Invite by link`}
              description={t`Share this link to invite users to join your workspace`}
            />
            <WorkspaceInviteLink
              inviteLink={`${window.location.origin}/invite/${currentWorkspace?.inviteHash}`}
            />
          </Section.Root>
        )}
      <Section.Root>
        <Section.Header
          title={t`Invite by email`}
          description={t`Send an invite email to your team`}
        />
        <WorkspaceInviteTeam roles={roles} />
        {isNonEmptyArray(workspaceInvitations) && (
          <Table {...stylex.props(styles.table)}>
            <TableRow
              gridAutoColumns="2fr 1fr 1fr 80px"
              mobileGridAutoColumns="2fr 1fr 1fr 72px"
            >
              <TableHeader>
                <Trans>Email</Trans>
              </TableHeader>
              <TableHeader>
                <Trans>Role</Trans>
              </TableHeader>
              <TableHeader align="center">
                <span {...stylex.props(styles.expiresInHeader)}>
                  <Trans>Expires in</Trans>
                </span>
              </TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
            <div {...stylex.props(styles.tableRows)}>
              {workspaceInvitations.map((workspaceInvitation) => (
                <TableRow
                  gridAutoColumns="2fr 1fr 1fr 80px"
                  mobileGridAutoColumns="2fr 1fr 1fr 72px"
                  key={workspaceInvitation.id}
                >
                  <TableCell
                    color={themeCssVariables.font.color.primary}
                    minWidth="0"
                    overflow="hidden"
                  >
                    <div {...stylex.props(styles.iconWrapper)}>
                      <IconMail
                        size={theme.icon.size.md}
                        stroke={theme.icon.stroke.sm}
                      />
                    </div>
                    <Tooltip
                      content={workspaceInvitation.email}
                      side="top"
                      positionMethod="fixed"
                      delay={TooltipDelay.shortDelay}
                    >
                      <div
                        id={`invitation-email-${workspaceInvitation.id}`}
                        {...stylex.props(styles.textContainerWithEllipsis)}
                      >
                        {workspaceInvitation.email}
                      </div>
                    </Tooltip>
                  </TableCell>
                  <TableCell minWidth="0" overflow="hidden">
                    <div {...stylex.props(styles.textContainerWithEllipsis)}>
                      {rolesById.get(workspaceInvitation.roleId ?? '')?.label ??
                        t`Default role`}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <Status color="gray">
                      {getExpiresAtText(workspaceInvitation.expiresAt)}
                    </Status>
                  </TableCell>
                  <TableCell align="right">
                    <div {...stylex.props(styles.buttonContainer)}>
                      <IconButton
                        aria-label={t`Resend invitation`}
                        onClick={() => {
                          handleResendWorkspaceInvitation(
                            workspaceInvitation.id,
                          );
                        }}
                        variant="ghost"
                        size="md"
                      >
                        <IconReload />
                      </IconButton>
                      <IconButton
                        aria-label={t`Remove invitation`}
                        onClick={() => {
                          handleRemoveWorkspaceInvitation(
                            workspaceInvitation.id,
                          );
                        }}
                        variant="ghost"
                        size="md"
                      >
                        <IconTrash />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </div>
          </Table>
        )}
      </Section.Root>
      <Section.Root>
        <Section.Header
          title={t`Approved Domains`}
          description={t`Anyone with an email address at these domains is allowed to sign up for this workspace.`}
        />
        <SettingsApprovedAccessDomainsListCard />
      </Section.Root>
    </>
  );
};
