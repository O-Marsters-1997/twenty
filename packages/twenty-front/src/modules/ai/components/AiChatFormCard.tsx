import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import {
  type RequestFormField,
  type RequestFormToolResult,
} from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/primitives/input';

import { aiChatAskStyles } from '@/ai/components/AiChatAskStyledComponents';
import { useAnswerAgentChatToolCall } from '@/ai/hooks/useAnswerAgentChatToolCall';
import { WorkflowFormFields } from '@/workflow/workflow-steps/workflow-actions/form-action/components/WorkflowFormFields';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  fields: {
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

type AiChatFormCardProps = {
  toolCallId: string;
  fields: RequestFormField[];
};

export const AiChatFormCard = ({ toolCallId, fields }: AiChatFormCardProps) => {
  const { t } = useLingui();
  const { answerAgentChatToolCall } = useAnswerAgentChatToolCall();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);

    const isAnswered = await answerAgentChatToolCall({
      toolCallId,
      response: values,
      optimisticToolOutput: {
        success: true,
        result: { status: 'answered', values } satisfies RequestFormToolResult,
      },
    });

    // The card goes once its call is closed, so it stays disabled until then.
    if (!isAnswered) {
      setIsSubmitting(false);
    }
  };

  return (
    <div {...stylex.props(aiChatAskStyles.card)}>
      <div {...stylex.props(styles.fields)}>
        <WorkflowFormFields
          fields={fields}
          readonly={isSubmitting}
          onChange={(fieldName, value) =>
            setValues((previousValues) => ({
              ...previousValues,
              [fieldName]: value,
            }))
          }
          onError={setError}
        />
      </div>
      <div {...stylex.props(styles.actions)}>
        <Button
          size="sm"
          variant="solid"
          color="accent"
          disabled={isSubmitting || isDefined(error)}
          loading={isSubmitting}
          onClick={() => void submit()}
        >
          {t`Submit`}
        </Button>
      </div>
    </div>
  );
};
