import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { LightButton } from 'twenty-ui/components/input';

import { aiChatAskStyles } from '@/ai/components/AiChatAskStyledComponents';
import { TextWithChatReferences } from '@/ai/components/TextWithChatReferences';
import { AiChatToolCallApprovalFeedbackInput } from '@/ai/components/internal/AiChatToolCallApprovalFeedbackInput';
import { useAiChatAskCardFieldFocus } from '@/ai/hooks/useAiChatAskCardFieldFocus';
import { type useAnswerToolCallApproval } from '@/ai/hooks/useAnswerToolCallApproval';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-3'],
  },
  label: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  summary: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  actions: {
    alignItems: 'center',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: borderColor['--t-border-color-light'],
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  actionsSpacer: {
    flex: '1',
  },
});

type AiChatToolCallApprovalCardLayoutProps = {
  label: string;
  summary: string;
  approval: ReturnType<typeof useAnswerToolCallApproval>;
  actions: ReactNode;
  children: ReactNode;
};

export const AiChatToolCallApprovalCardLayout = ({
  label,
  summary,
  approval,
  actions,
  children,
}: AiChatToolCallApprovalCardLayoutProps) => {
  const { t } = useLingui();
  const { handleFieldFocus, handleFieldBlur } = useAiChatAskCardFieldFocus();
  const { isAnswering, isFeedbackShown, showFeedback, feedback, setFeedback } =
    approval;

  return (
    <div {...stylex.props(aiChatAskStyles.card)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.label)}>{label}</span>
        <span {...stylex.props(styles.summary)}>
          <TextWithChatReferences text={summary} />
        </span>
      </div>
      <div
        onFocus={handleFieldFocus}
        onBlur={handleFieldBlur}
        {...stylex.props(styles.body)}
      >
        {children}
        {isFeedbackShown && (
          <AiChatToolCallApprovalFeedbackInput
            value={feedback}
            disabled={isAnswering}
            onChange={setFeedback}
          />
        )}
      </div>
      <div {...stylex.props(styles.actions)}>
        {!isFeedbackShown && (
          <LightButton disabled={isAnswering} onClick={showFeedback}>
            {t`Add feedback`}
          </LightButton>
        )}
        <div {...stylex.props(styles.actionsSpacer)} />
        {actions}
      </div>
    </div>
  );
};
