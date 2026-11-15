
import { type EmailThreadMessageParticipant } from '@/activities/emails/types/EmailThreadMessageParticipant';
import { getDisplayNameFromParticipant } from '@/activities/emails/utils/getDisplayNameFromParticipant';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

type EmailThreadMessageReceiversProps = {
  receivers: EmailThreadMessageParticipant[];
};

const styles = stylex.create({
  threadMessageReceivers: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-0'],
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: spacing['--t-spacing-1'],
    width: '50%',
  },
});

export const EmailThreadMessageReceivers = ({
  receivers,
}: EmailThreadMessageReceiversProps) => {
  const displayedReceivers = receivers
    .map((receiver) => getDisplayNameFromParticipant({ participant: receiver }))
    .join(', ');

  const body = `to: ${displayedReceivers}`;

  return (
    <span {...stylex.props(styles.threadMessageReceivers)}>
      <OverflowingTextWithTooltip text={body} />
    </span>
  );
};
