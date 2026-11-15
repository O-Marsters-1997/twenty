import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  CoreObjectNameSingular,
  MessageCampaignStatus,
} from 'twenty-shared/types';
import { isDefined, isValidUuid } from 'twenty-shared/utils';

import {
  CampaignEnvelopeBox,
  CampaignEnvelopeRow,
} from '@/activities/emails/components/CampaignEnvelopeBox';
import { useUnsubscribeTopics } from '@/activities/emails/hooks/useUnsubscribeTopics';
import { type MessageCampaign } from '@/activities/emails/types/MessageCampaign';
import { formatCampaignSendTime } from '@/activities/emails/utils/formatCampaignSendTime';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { RecordChip } from '@/object-record/components/RecordChip';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  value: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyValue: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-md'],
  },
});

type CampaignSentEnvelopeProps = {
  campaign: MessageCampaign;
  width: string;
};

// Doesn't reuse CampaignDetailsFields, which owns draft persistence state a sent campaign has no use for.
export const CampaignSentEnvelope = ({
  campaign,
  width,
}: CampaignSentEnvelopeProps) => {
  const { unsubscribeTopics, loading: areTopicsLoading } =
    useUnsubscribeTopics();
  const { dateFormat, timeFormat, timeZone } = useDateTimeFormat();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);

  const hasList = isDefined(campaign.listId) && isValidUuid(campaign.listId);

  const { record: list, loading: isListLoading } = useFindOneRecord({
    objectNameSingular: CoreObjectNameSingular.MessageList,
    objectRecordId: campaign.listId ?? '',
    // A list deleted after the send must still name what the campaign went to.
    withSoftDeleted: true,
    skip: !hasList,
  });

  // An empty lookup can't tell deletion, permissions or failure apart, so report what's true in every case.
  const isListUnresolved = hasList && !isDefined(list) && !isListLoading;

  const fromAddress = campaign.fromAddress?.primaryEmail;
  const subject = campaign.subject;

  // Follows the sent id: a topic deleted afterwards must not erase that the send was scoped to one.
  const hasUnsubscribeTopic = isDefined(campaign.unsubscribeTopicId);

  const unsubscribeTopic = hasUnsubscribeTopic
    ? unsubscribeTopics.find(
        (topic) => topic.id === campaign.unsubscribeTopicId,
      )
    : undefined;

  // A missing topic may be deleted or unreadable by this role; the two look alike.
  const isTopicUnresolved =
    hasUnsubscribeTopic && !isDefined(unsubscribeTopic) && !areTopicsLoading;

  const scheduledSendTime =
    campaign.status === MessageCampaignStatus.SCHEDULED
      ? formatCampaignSendTime({
          value: campaign.scheduledAt,
          timeZone,
          dateFormat,
          timeFormat,
          localeCatalog,
        })
      : '';

  return (
    <CampaignEnvelopeBox width={width}>
      <CampaignEnvelopeRow label={t`From`}>
        {isNonEmptyString(fromAddress) ? (
          <span {...stylex.props(styles.value)}>{fromAddress}</span>
        ) : (
          <span {...stylex.props(styles.emptyValue)}>{t`No sender`}</span>
        )}
      </CampaignEnvelopeRow>
      <CampaignEnvelopeRow label={t`To`}>
        {isDefined(list) ? (
          <RecordChip
            record={list}
            objectNameSingular={CoreObjectNameSingular.MessageList}
          />
        ) : !hasList ? (
          <span {...stylex.props(styles.emptyValue)}>{t`No list`}</span>
        ) : (
          isListUnresolved && (
            <span {...stylex.props(styles.emptyValue)}>{t`Unavailable`}</span>
          )
        )}
      </CampaignEnvelopeRow>
      {hasUnsubscribeTopic && (
        <CampaignEnvelopeRow label={t`Unsubscribe topic`}>
          {isDefined(unsubscribeTopic) ? (
            <span {...stylex.props(styles.value)}>
              {unsubscribeTopic.name ?? t`Untitled topic`}
            </span>
          ) : (
            isTopicUnresolved && (
              <span {...stylex.props(styles.emptyValue)}>{t`Unavailable`}</span>
            )
          )}
        </CampaignEnvelopeRow>
      )}
      <CampaignEnvelopeRow label={t`Subject`}>
        {isNonEmptyString(subject) ? (
          <span {...stylex.props(styles.value)}>{subject}</span>
        ) : (
          <span {...stylex.props(styles.emptyValue)}>{t`No subject`}</span>
        )}
      </CampaignEnvelopeRow>
      {isNonEmptyString(scheduledSendTime) && (
        <CampaignEnvelopeRow label={t`Scheduled at`}>
          <span {...stylex.props(styles.value)}>{scheduledSendTime}</span>
        </CampaignEnvelopeRow>
      )}
    </CampaignEnvelopeBox>
  );
};
