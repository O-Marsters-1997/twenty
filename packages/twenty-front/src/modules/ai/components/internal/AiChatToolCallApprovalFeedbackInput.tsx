import { useLingui } from '@lingui/react/macro';
import TextareaAutosize from 'react-textarea-autosize';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  textarea: {
    backgroundColor: 'transparent',
    borderColor: {
      default: borderColor['--t-border-color-light'],
      ':focus-visible': color['--t-color-blue'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    color: fontColor['--t-font-color-primary'],
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: 1.5,
    outline: 'none',
    padding: spacing['--t-spacing-2'],
    resize: 'none',
  },
});

type AiChatToolCallApprovalFeedbackInputProps = {
  value: string;
  disabled: boolean;
  onChange: (feedback: string) => void;
};

export const AiChatToolCallApprovalFeedbackInput = ({
  value,
  disabled,
  onChange,
}: AiChatToolCallApprovalFeedbackInputProps) => {
  const { t } = useLingui();

  return (
    <TextareaAutosize
      {...stylex.props(styles.textarea)}
      aria-label={t`Feedback`}
      placeholder={t`Tell the agent what to change`}
      minRows={2}
      maxRows={8}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};
