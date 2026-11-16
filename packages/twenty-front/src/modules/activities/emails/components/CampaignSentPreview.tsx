import { t } from '@lingui/core/macro';
import { type Editor } from '@tiptap/core';
import { useState } from 'react';

import { CampaignSentEnvelope } from '@/activities/emails/components/CampaignSentEnvelope';
import { EmailEditorCanvas } from '@/activities/emails/editor/components/EmailEditorCanvas';
import { CAMPAIGN_BODY_EDITOR_PROFILE } from '@/activities/emails/editor/constants/CampaignBodyEditorProfile';
import { useCampaignCanvasWidth } from '@/activities/emails/hooks/useCampaignCanvasWidth';
import { type MessageCampaign } from '@/activities/emails/types/MessageCampaign';
import { FormAdvancedTextFieldInput } from '@/advanced-text-editor/components/FormAdvancedTextFieldInput';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '0',
    width: '100%',
  },
  body: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '0',
  },
});

type CampaignSentPreviewProps = {
  campaign: MessageCampaign;
};

export const CampaignSentPreview = ({ campaign }: CampaignSentPreviewProps) => {
  const [bodyEditor, setBodyEditor] = useState<Editor | null>(null);
  const canvasWidth = useCampaignCanvasWidth(bodyEditor);

  return (
    <div {...stylex.props(styles.container)}>
      <CampaignSentEnvelope campaign={campaign} width={canvasWidth} />
      <div {...stylex.props(styles.body)}>
        <FormAdvancedTextFieldInput
          defaultValue={campaign.bodyTemplate}
          readonly
          profile={CAMPAIGN_BODY_EDITOR_PROFILE}
          EditorComponent={EmailEditorCanvas}
          placeholder={t`No content`}
          onEditorReady={setBodyEditor}
        />
      </div>
    </div>
  );
};
