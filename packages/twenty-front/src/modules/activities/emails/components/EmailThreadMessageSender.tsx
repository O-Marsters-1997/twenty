import { t } from '@lingui/core/macro';

import { ParticipantChip } from '@/activities/components/ParticipantChip';
import { type EmailThreadMessageParticipant } from '@/activities/emails/types/EmailThreadMessageParticipant';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import {
  beautifyPastDateRelativeToNow,
  formatToHumanReadableDate,
} from '~/utils/date-utils';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  emailThreadMessageSender: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  unknownSender: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-1'],
  },
  threadMessageSentAt: {
    alignItems: 'flex-end',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type EmailThreadMessageSenderProps = {
  sender?: EmailThreadMessageParticipant;
  sentAt: string | null;
};

export const EmailThreadMessageSender = ({
  sender,
  sentAt,
}: EmailThreadMessageSenderProps) => {
  const { localeCatalog } = useAtomStateValue(dateLocaleState);
  let sentAtContent = null;

  if (isDefined(sentAt)) {
    const tooltipId = `date-tooltip-${sentAt.replace(/[^a-zA-Z0-9]/g, '-')}`;

    sentAtContent = (
      <Tooltip
        delay={TooltipDelay.mediumDelay}
        content={formatToHumanReadableDate(sentAt)}
        side="top"
      >
        <div id={tooltipId} {...stylex.props(styles.threadMessageSentAt)}>
          {beautifyPastDateRelativeToNow(sentAt, localeCatalog)}
        </div>
      </Tooltip>
    );
  }

  return (
    <div {...stylex.props(styles.emailThreadMessageSender)}>
      {isDefined(sender) ? (
        <ParticipantChip participant={sender} variant="bold" />
      ) : (
        <span {...stylex.props(styles.unknownSender)}>{t`Unknown sender`}</span>
      )}
      {sentAtContent}
    </div>
  );
};
