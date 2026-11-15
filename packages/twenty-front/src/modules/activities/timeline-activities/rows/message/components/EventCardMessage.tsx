import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { Trans } from '@lingui/react/macro';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined, isFieldValueRestricted } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';

import { type EmailThreadMessage } from '@/activities/emails/types/EmailThreadMessage';
import { EventCardMessageForbidden } from '@/activities/timeline-activities/rows/message/components/EventCardMessageForbidden';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  eventCardMessageContainer: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '380px',
    width: '100%',
  },
  emailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    justifyContent: 'center',
  },
  emailTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  emailTitle: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emailParticipants: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  emailBody: {
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export const EventCardMessage = ({
  messageId,
  authorFullName,
}: {
  messageId: string;
  authorFullName: string;
}) => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const {
    record: message,
    loading,
    error,
  } = useFindOneRecord<EmailThreadMessage>({
    objectNameSingular: CoreObjectNameSingular.Message,
    objectRecordId: messageId,
    recordGqlFields: {
      id: true,
      text: true,
      subject: true,
      direction: true,
      messageThreadId: true,
      messageParticipants: {
        handle: true,
      },
    },
  });

  if (isDefined(error)) {
    if (CombinedGraphQLErrors.is(error)) {
      if (
        error.errors.some(
          (graphQLError) => graphQLError.extensions?.code === 'FORBIDDEN',
        )
      ) {
        return (
          <EventCardMessageForbidden notSharedByFullName={authorFullName} />
        );
      }

      if (
        error.errors.some(
          (graphQLError) => graphQLError.extensions?.code === 'NOT_FOUND',
        )
      ) {
        return <Trans>Message not found</Trans>;
      }
    }

    return <Trans>Error loading message</Trans>;
  }

  if (loading) {
    return <Trans>Loading...</Trans>;
  }

  if (!isDefined(message)) {
    return <EventCardMessageForbidden notSharedByFullName={authorFullName} />;
  }

  if ([message.subject, message.text].some(isFieldValueRestricted)) {
    return <EventCardMessageForbidden notSharedByFullName={authorFullName} />;
  }

  const participantHandles = message.messageParticipants
    .map((participant) => participant.handle)
    .filter((handle) => isDefined(handle) && handle !== '')
    .join(', ');

  const handleClick = () => {
    if (isDefined(message.messageThreadId)) {
      openRecordInSidePanel({
        recordId: message.messageThreadId,
        objectNameSingular: CoreObjectNameSingular.MessageThread,
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      {...stylex.props(styles.eventCardMessageContainer)}
    >
      <div {...stylex.props(styles.emailContent)}>
        <div {...stylex.props(styles.emailTop)}>
          <div {...stylex.props(styles.emailTitle)}>{message.subject}</div>
          <div {...stylex.props(styles.emailParticipants)}>
            <OverflowingTextWithTooltip text={participantHandles} />
          </div>
        </div>
        <div {...stylex.props(styles.emailBody)}>{message.text}</div>
      </div>
    </div>
  );
};
