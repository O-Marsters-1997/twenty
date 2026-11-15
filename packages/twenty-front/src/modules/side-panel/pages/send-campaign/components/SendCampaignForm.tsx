import { plural, t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import {
  CoreObjectNameSingular,
  MessageCampaignStatus,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconClock, IconSend } from 'twenty-ui/icon';
import { Button, type SelectOption } from 'twenty-ui/primitives/input';
import { Text } from 'twenty-ui/primitives/typography';

import { useCampaignAudiencePreview } from '@/activities/emails/hooks/useCampaignAudiencePreview';
import { useSendMessageCampaign } from '@/activities/emails/hooks/useSendMessageCampaign';
import { type MessageCampaign } from '@/activities/emails/types/MessageCampaign';
import { buildDefaultCampaignScheduledAt } from '@/activities/emails/utils/buildDefaultCampaignScheduledAt';
import { buildExcludedRecipientReasons } from '@/activities/emails/utils/buildExcludedRecipientReasons';
import { formatCampaignSendTime } from '@/activities/emails/utils/formatCampaignSendTime';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { RecordChip } from '@/object-record/components/RecordChip';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { FormDateTimeFieldInput } from '@/object-record/record-field/ui/form-types/components/FormDateTimeFieldInput';
import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { type CampaignDeliveryTiming } from '@/side-panel/pages/send-campaign/types/CampaignDeliveryTiming';
import { buildCampaignDeliveryHint } from '@/side-panel/pages/send-campaign/utils/buildCampaignDeliveryHint';
import { buildCampaignSendButtonTitle } from '@/side-panel/pages/send-campaign/utils/buildCampaignSendButtonTitle';
import { Select } from '@/ui/input/components/Select';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  content: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-5'],
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
  },
  section: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
  },
  recipientCount: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xl'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  hint: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  errorHint: {
    color: fontColor['--t-font-color-danger'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  displayLabel: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  value: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  valueEmpty: {
    color: fontColor['--t-font-color-light'],
  },
  deliveryFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    width: '100%',
  },
});

type SendCampaignFormProps = {
  campaign: MessageCampaign;
};

export const SendCampaignForm = ({ campaign }: SendCampaignFormProps) => {
  const isAlreadyScheduled =
    campaign.status === MessageCampaignStatus.SCHEDULED;

  const { goBackFromSidePanel } = useSidePanelHistory();
  const { formatNumber } = useNumberFormat();
  const { dateFormat, timeFormat, timeZone } = useDateTimeFormat();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);
  const { sendMessageCampaign, loading: isSending } = useSendMessageCampaign();

  const [deliveryTiming, setDeliveryTiming] = useState<CampaignDeliveryTiming>(
    isAlreadyScheduled ? 'LATER' : 'NOW',
  );
  const [scheduledAt, setScheduledAt] = useState<string | null>(
    campaign.scheduledAt,
  );

  const { record: list } = useFindOneRecord({
    objectNameSingular: CoreObjectNameSingular.MessageList,
    objectRecordId: campaign.listId ?? '',
    skip: !isDefined(campaign.listId),
  });

  const { audiencePreview, hasFailed: hasAudiencePreviewFailed } =
    useCampaignAudiencePreview({
      listId: campaign.listId,
      unsubscribeTopicId: campaign.unsubscribeTopicId,
    });

  const fromAddress = campaign.fromAddress?.primaryEmail;
  const subject = campaign.subject;

  const excludedReasons = isDefined(audiencePreview)
    ? buildExcludedRecipientReasons({ counts: audiencePreview, formatNumber })
    : [];

  const isScheduling = deliveryTiming === 'LATER';

  const isScheduledInTheFuture =
    isNonEmptyString(scheduledAt) &&
    new Date(scheduledAt).getTime() > Date.now();

  const hasInvalidSendTime = isScheduling && !isScheduledInTheFuture;

  const formattedSendTime = isScheduledInTheFuture
    ? formatCampaignSendTime({
        value: scheduledAt,
        timeZone,
        dateFormat,
        timeFormat,
        localeCatalog,
      })
    : null;

  const isCampaignReady =
    isDefined(list) &&
    isNonEmptyString(fromAddress) &&
    isNonEmptyString(subject) &&
    isNonEmptyString(campaign.bodyTemplate) &&
    isDefined(audiencePreview) &&
    audiencePreview.sendable > 0;

  const canSend = isCampaignReady && !hasInvalidSendTime;

  const deliveryTimingOptions: SelectOption<CampaignDeliveryTiming>[] = [
    { label: t`Send now`, value: 'NOW' },
    { label: t`Send later`, value: 'LATER' },
  ];

  const deliveryHint = buildCampaignDeliveryHint({
    deliveryTiming,
    isAlreadyScheduled,
    formattedSendTime,
  });

  const handleDeliveryTimingChange = (timing: CampaignDeliveryTiming) => {
    setDeliveryTiming(timing);

    if (timing === 'LATER' && !isNonEmptyString(scheduledAt)) {
      setScheduledAt(buildDefaultCampaignScheduledAt().toISOString());
    }
  };

  const handleSend = async () => {
    const sent = await sendMessageCampaign({
      campaignId: campaign.id,
      scheduledAt: isScheduling ? (scheduledAt ?? undefined) : undefined,
      wasAlreadyScheduled: isAlreadyScheduled,
    });

    if (sent) {
      goBackFromSidePanel();
    }
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.content)}>
        <div {...stylex.props(styles.section)}>
          <Text {...stylex.props(styles.displayLabel)}>{t`Recipients`}</Text>
          {isDefined(audiencePreview) ? (
            <>
              <span {...stylex.props(styles.recipientCount)}>
                {plural(audiencePreview.sendable, {
                  one: `${formatNumber(audiencePreview.sendable)} recipient`,
                  other: `${formatNumber(audiencePreview.sendable)} recipients`,
                })}
              </span>
              {excludedReasons.length > 0 && (
                <span {...stylex.props(styles.hint)}>
                  {t`${formatNumber(audiencePreview.totalMembers)} in the list, skipping ${excludedReasons.join(', ')}`}
                </span>
              )}
              {audiencePreview.trackingRefused > 0 && (
                <span {...stylex.props(styles.hint)}>
                  {t`${formatNumber(audiencePreview.trackingRefused)} opted out of email tracking, their clicks are not recorded`}
                </span>
              )}
              {isScheduling && (
                <span {...stylex.props(styles.hint)}>
                  {t`Counted again when the campaign sends, so this can change.`}
                </span>
              )}
            </>
          ) : (
            <span {...stylex.props(styles.hint)}>
              {hasAudiencePreviewFailed
                ? t`Recipient count unavailable`
                : t`Counting recipients...`}
            </span>
          )}
        </div>
        <div {...stylex.props(styles.section)}>
          <Text {...stylex.props(styles.displayLabel)}>{t`List`}</Text>
          {isDefined(list) ? (
            <RecordChip
              record={list}
              objectNameSingular={CoreObjectNameSingular.MessageList}
            />
          ) : (
            <span {...stylex.props(styles.value, styles.valueEmpty)}>
              {t`No list`}
            </span>
          )}
        </div>
        <div {...stylex.props(styles.section)}>
          <Text {...stylex.props(styles.displayLabel)}>{t`From`}</Text>
          <span
            {...stylex.props(
              styles.value,
              !isNonEmptyString(fromAddress) && styles.valueEmpty,
            )}
          >
            {isNonEmptyString(fromAddress) ? fromAddress : t`No sender`}
          </span>
        </div>
        <div {...stylex.props(styles.section)}>
          <Text {...stylex.props(styles.displayLabel)}>{t`Subject`}</Text>
          <span
            {...stylex.props(
              styles.value,
              !isNonEmptyString(subject) && styles.valueEmpty,
            )}
          >
            {isNonEmptyString(subject) ? subject : t`No subject`}
          </span>
        </div>
        <div {...stylex.props(styles.section)}>
          <Text {...stylex.props(styles.displayLabel)}>{t`Delivery`}</Text>
          <div {...stylex.props(styles.deliveryFields)}>
            <Select
              dropdownId="send-campaign-delivery-timing"
              fullWidth
              value={deliveryTiming}
              options={deliveryTimingOptions}
              onChange={handleDeliveryTimingChange}
            />
            {hasInvalidSendTime ? (
              <span {...stylex.props(styles.errorHint)}>{deliveryHint}</span>
            ) : (
              <span {...stylex.props(styles.hint)}>{deliveryHint}</span>
            )}
            {isScheduling && (
              <FormDateTimeFieldInput
                label={t`Send at`}
                defaultValue={scheduledAt ?? undefined}
                onChange={setScheduledAt}
              />
            )}
          </div>
        </div>
      </div>
      <SidePanelFooter
        actions={[
          <Button
            key="send"
            startIcon={isScheduling ? <IconClock /> : <IconSend />}
            size="sm"
            disabled={!canSend || isSending}
            onClick={handleSend}
            variant="solid"
            color="accent"
          >
            {buildCampaignSendButtonTitle({
              deliveryTiming,
              isAlreadyScheduled,
            })}
          </Button>,
        ]}
      />
    </div>
  );
};
