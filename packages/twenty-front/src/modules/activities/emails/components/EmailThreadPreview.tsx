
import { ActivityRow } from '@/activities/components/ActivityRow';
import { EmailThreadNotShared } from '@/activities/emails/components/EmailThreadNotShared';
import { getEmailParticipantAvatarColorSeed } from '@/activities/emails/utils/getEmailParticipantAvatarColorSeed';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';

import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Avatar, Tag } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';
import {
  MessageChannelVisibility,
  type TimelineThread,
} from '~/generated/graphql';
import { formatToHumanReadableDate } from '~/utils/date-utils';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  heading: {
    display: 'flex',
    maxWidth: '20%',
    overflow: 'hidden',
    width: 'fit-content',
  },
  participantsContainer: {
    alignItems: 'flex-start',
    display: 'flex',
  },
  avatarWrapper: {
    marginLeft: `calc(-1 * ${spacing['--t-spacing-1']})`,
  },
  senderNames: {
    display: 'flex',
    marginTop: spacing['--t-spacing-0'],
    marginRight: spacing['--t-spacing-1'],
    marginBottom: spacing['--t-spacing-0'],
    marginLeft: spacing['--t-spacing-1'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  threadCount: {
    color: fontColor['--t-font-color-tertiary'],
  },
  subjectAndBody: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
  },
  subject: {
    color: fontColor['--t-font-color-primary'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  body: {
    color: fontColor['--t-font-color-tertiary'],
    flex: '1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  receivedAt: {
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    paddingTop: spacing['--t-spacing-0'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-0'],
    paddingLeft: spacing['--t-spacing-1'],
  },
});

type EmailThreadPreviewProps = {
  thread: TimelineThread;
};

type LastAvatar = {
  displayedName: string | undefined;
  avatarUrl: string | undefined;
  isCountIcon: boolean;
  placeholderColorSeed: string | undefined;
};

export const EmailThreadPreview = ({ thread }: EmailThreadPreviewProps) => {
  const theme = useTheme();
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  const visibility = thread.visibility;

  const senderNames =
    thread.firstParticipant.displayName +
    (thread?.lastTwoParticipants?.[0]?.displayName
      ? `, ${thread.lastTwoParticipants?.[0]?.displayName}`
      : '') +
    (thread?.lastTwoParticipants?.[1]?.displayName
      ? `, ${thread.lastTwoParticipants?.[1]?.displayName}`
      : '');

  const lastParticipant = thread?.lastTwoParticipants?.[1];

  const {
    displayedName,
    avatarUrl,
    isCountIcon,
    placeholderColorSeed,
  }: LastAvatar =
    thread.participantCount > 3
      ? {
          displayedName: `${thread.participantCount}`,
          avatarUrl: '',
          isCountIcon: true,
          placeholderColorSeed: undefined,
        }
      : {
          displayedName: lastParticipant?.displayName,
          avatarUrl: lastParticipant?.avatarUrl,
          isCountIcon: false,
          placeholderColorSeed: isDefined(lastParticipant)
            ? getEmailParticipantAvatarColorSeed(lastParticipant)
            : undefined,
        };

  const handleThreadClick = () => {
    const canOpen =
      thread.visibility === MessageChannelVisibility.SHARE_EVERYTHING;

    if (canOpen) {
      openRecordInSidePanel({
        recordId: thread.id,
        objectNameSingular: CoreObjectNameSingular.MessageThread,
      });
    }
  };

  const isDisabled = visibility !== MessageChannelVisibility.SHARE_EVERYTHING;
  const isSubjectVisible =
    visibility === MessageChannelVisibility.SUBJECT ||
    visibility === MessageChannelVisibility.SHARE_EVERYTHING;
  const label =
    isSubjectVisible && isNonEmptyString(thread.subject)
      ? thread.subject
      : t`Email thread`;

  return (
    <ActivityRow
      onClick={handleThreadClick}
      disabled={isDisabled}
      label={label}
    >
      <div {...stylex.props(styles.heading)}>
        <div {...stylex.props(styles.participantsContainer)}>
          <Avatar
            src={getAbsoluteImageUrl(thread?.firstParticipant?.avatarUrl)}
            name={thread.firstParticipant.displayName}
            colorSeed={getEmailParticipantAvatarColorSeed(
              thread.firstParticipant,
            )}
            shape="circle"
          />
          {isDefined(thread?.lastTwoParticipants?.[0]) && (
            <div {...stylex.props(styles.avatarWrapper)}>
              <Avatar
                src={getAbsoluteImageUrl(
                  thread.lastTwoParticipants[0].avatarUrl,
                )}
                name={thread.lastTwoParticipants[0].displayName}
                colorSeed={getEmailParticipantAvatarColorSeed(
                  thread.lastTwoParticipants[0],
                )}
                shape="circle"
              />
            </div>
          )}
          {displayedName && (
            <div {...stylex.props(styles.avatarWrapper)}>
              <Avatar
                src={getAbsoluteImageUrl(avatarUrl)}
                name={displayedName}
                colorSeed={placeholderColorSeed}
                shape="circle"
                color={isCountIcon ? theme.grayScale.gray11 : undefined}
                backgroundColor={
                  isCountIcon ? theme.grayScale.gray2 : undefined
                }
              />
            </div>
          )}
        </div>

        <span {...stylex.props(styles.senderNames)}>{senderNames}</span>
        <span {...stylex.props(styles.threadCount)}>{thread.numberOfMessagesInThread}</span>
      </div>

      <div {...stylex.props(styles.subjectAndBody)}>
        {visibility === MessageChannelVisibility.METADATA && (
          <EmailThreadNotShared visibility={visibility} />
        )}
        {visibility === MessageChannelVisibility.SUBJECT && (
          <>
            <span {...stylex.props(styles.subject)}>{thread.subject}</span>
            <EmailThreadNotShared visibility={visibility} />
          </>
        )}
        {visibility === MessageChannelVisibility.SHARE_EVERYTHING && (
          <>
            {thread.lastMessageIsDraft && <Tag color="orange">{t`Draft`}</Tag>}
            <span {...stylex.props(styles.subject)}>{thread.subject}</span>
            <span {...stylex.props(styles.body)}>{thread.lastMessageBody}</span>
          </>
        )}
      </div>
      <div {...stylex.props(styles.receivedAt)}>
        {formatToHumanReadableDate(thread.lastMessageReceivedAt)}
      </div>
    </ActivityRow>
  );
};
