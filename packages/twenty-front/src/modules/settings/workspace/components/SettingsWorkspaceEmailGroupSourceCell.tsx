import { type MessageChannel } from '@/accounts/types/MessageChannel';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  nameCell: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    minWidth: '0',
  },
});

type SettingsWorkspaceEmailGroupSourceCellProps = {
  item: MessageChannel;
};

export const SettingsWorkspaceEmailGroupSourceCell = ({
  item,
}: SettingsWorkspaceEmailGroupSourceCellProps) => {
  const sourceHandle = item.connectedAccount?.handle;

  return (
    <div {...stylex.props(styles.nameCell)}>
      <OverflowingTextWithTooltip text={sourceHandle ?? '—'} />
    </div>
  );
};
