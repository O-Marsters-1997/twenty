import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { useLingui } from '@lingui/react/macro';
import { IconLink } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  linkContainer: {
    flex: '1',
    marginRight: spacing['--t-spacing-2'],
  },
});

type WorkspaceInviteLinkProps = {
  inviteLink: string;
};

export const WorkspaceInviteLink = ({
  inviteLink,
}: WorkspaceInviteLinkProps) => {
  const { t } = useLingui();

  const { copyToClipboard } = useCopyToClipboard();

  return (
    <div data-chromatic="ignore" {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.linkContainer)}>
        <SettingsTextInput
          instanceId="workspace-invite-link"
          value={inviteLink}
          disabled
          fullWidth
        />
      </div>
      <Button
        startIcon={<IconLink />}
        onClick={() => {
          copyToClipboard(inviteLink, t`Link copied to clipboard`);
        }}
        variant="solid"
        color="accent"
      >{t`Copy link`}</Button>
    </div>
  );
};
