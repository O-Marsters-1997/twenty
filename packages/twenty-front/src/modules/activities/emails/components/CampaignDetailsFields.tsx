import { t } from '@lingui/core/macro';
import { useId } from 'react';
import {
  CoreObjectNameSingular,
  MessageChannelType,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { InlineBanner } from 'twenty-ui/components/feedback';
import { IconAlertTriangle } from 'twenty-ui/icon';
import { type SelectOption } from 'twenty-ui/primitives/input';

import {
  CampaignEnvelopeBox,
  CampaignEnvelopeRow,
} from '@/activities/emails/components/CampaignEnvelopeBox';
import { useCampaignDetailsState } from '@/activities/emails/hooks/useCampaignDetailsState';
import { useUnsubscribeTopics } from '@/activities/emails/hooks/useUnsubscribeTopics';
import { type MessageCampaign } from '@/activities/emails/types/MessageCampaign';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { FormSingleRecordPicker } from '@/object-record/record-field/ui/form-types/components/FormSingleRecordPicker';
import { useMyMessageChannels } from '@/settings/accounts/hooks/useMyMessageChannels';
import { Select } from '@/ui/input/components/Select';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { useRemoveFocusItemFromFocusStackOnUnmount } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackOnUnmount';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  subjectInput: {
    background: 'transparent',
    borderStyle: 'none',
    color: fontColor['--t-font-color-primary'],
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    outline: 'none',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    width: '100%',
  },
  warningContainer: {
    marginTop: spacing['--t-spacing-2'],
  },
});

type CampaignDetailsFieldsProps = {
  campaign: MessageCampaign;
  width: string;
};

export const CampaignDetailsFields = ({
  campaign,
  width,
}: CampaignDetailsFieldsProps) => {
  const detailsState = useCampaignDetailsState({ campaign });
  const instanceId = useId();
  const subjectFocusId = `campaign-subject-input-${instanceId}`;
  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();
  useRemoveFocusItemFromFocusStackOnUnmount({
    focusId: subjectFocusId,
    isEnabled: true,
  });

  const handleSubjectFocus = () =>
    pushFocusItemToFocusStack({
      focusId: subjectFocusId,
      component: {
        type: FocusComponentType.FORM_FIELD_INPUT,
        instanceId: subjectFocusId,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    });

  const handleSubjectBlur = () =>
    removeFocusItemFromFocusStackById({ focusId: subjectFocusId });

  const { channels } = useMyMessageChannels();
  const { unsubscribeTopics } = useUnsubscribeTopics();
  const { createOneRecord: createMessageList } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.MessageList,
  });

  const handleCreateList = async (searchInput?: string) => {
    const listName = searchInput?.trim() ?? '';
    const createdList = await createMessageList({
      name: listName.length > 0 ? listName : t`Untitled list`,
    });

    if (isDefined(createdList)) {
      detailsState.setListId(createdList.id);
    }
  };

  const senderOptions: SelectOption<string>[] = channels
    .filter((channel) => channel.type === MessageChannelType.EMAIL_GROUP)
    .map((channel) => channel.connectedAccount?.handle)
    .filter(isDefined)
    .map((handle) => ({ label: handle, value: handle }));

  const topicOptions: SelectOption<string>[] = unsubscribeTopics.map(
    (topic) => ({
      label: topic.name ?? t`Untitled topic`,
      value: topic.id,
    }),
  );

  const hasTopicOptions = topicOptions.length > 0;
  const hasSenderOptions = senderOptions.length > 0;

  return (
    <CampaignEnvelopeBox
      width={width}
      onBlur={() => detailsState.flush()}
      below={
        !hasSenderOptions && (
          <div {...stylex.props(styles.warningContainer)}>
            <InlineBanner
              embedded
              status="error"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >{t`No sending address. Connect a verified domain in Settings.`}</InlineBanner>
          </div>
        )
      }
    >
      <CampaignEnvelopeRow label={t`From`}>
        <Select
          dropdownId="campaign-composer-from-account"
          fullWidth
          value={detailsState.fromAddress}
          options={senderOptions}
          emptyOption={{ label: t`Select a sender`, value: '' }}
          onChange={detailsState.setFromAddress}
        />
      </CampaignEnvelopeRow>
      <CampaignEnvelopeRow label={t`To`}>
        <FormSingleRecordPicker
          key={`list-${detailsState.draftResyncKey}`}
          objectNameSingulars={[CoreObjectNameSingular.MessageList]}
          defaultValue={detailsState.listId}
          onChange={detailsState.setListId}
          onCreate={handleCreateList}
        />
      </CampaignEnvelopeRow>
      {hasTopicOptions && (
        <CampaignEnvelopeRow label={t`Unsubscribe topic`}>
          <Select
            dropdownId="campaign-composer-unsubscribe-topic"
            fullWidth
            value={detailsState.unsubscribeTopicId ?? ''}
            options={topicOptions}
            emptyOption={{ label: t`No topic`, value: '' }}
            onChange={(value) =>
              detailsState.setUnsubscribeTopicId(value === '' ? null : value)
            }
          />
        </CampaignEnvelopeRow>
      )}
      <CampaignEnvelopeRow label={t`Subject`}>
        <input
          key={`subject-${detailsState.draftResyncKey}`}
          type="text"
          aria-label={t`Subject`}
          defaultValue={detailsState.subject}
          onChange={(event) => detailsState.setSubject(event.target.value)}
          onFocus={handleSubjectFocus}
          onBlur={handleSubjectBlur}
          {...stylex.props(styles.subjectInput)}
        />
      </CampaignEnvelopeRow>
    </CampaignEnvelopeBox>
  );
};
