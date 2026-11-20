import { EventCardMessageBodyNotShared } from '@/activities/timeline-activities/rows/message/components/EventCardMessageBodyNotShared';
import { Trans } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  eventCardMessageContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  emailContent: {
    gap: spacing['--t-spacing-4'],
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
  },
  emailTitle: {
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'column',
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginTop: spacing['--t-spacing-2'],
  },
});

export const EventCardMessageForbidden = ({
  notSharedByFullName,
}: {
  notSharedByFullName: string;
}) => (
  <div {...stylex.props(styles.eventCardMessageContainer)}>
    <div {...stylex.props(styles.emailContent)}>
      <div {...stylex.props(styles.emailTitle)}>
        <Trans>Subject not shared</Trans>
      </div>
      <EventCardMessageBodyNotShared
        notSharedByFullName={notSharedByFullName}
      />
    </div>
  </div>
);
