import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import { parseAndValidateVariableFriendlyStringifiedJson } from '~/utils/parseAndValidateVariableFriendlyStringifiedJson';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  codeFont,
  color,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  textarea: {
    padding: spacing['--t-spacing-2'],
    borderColor: {
      default: borderColor['--t-border-color-light'],
      ':focus-visible': color['--t-color-blue'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    outline: 'none',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    color: fontColor['--t-font-color-primary'],
    fontFamily: codeFont['--t-code-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: 1.5,
    resize: 'none',
  },
  error: {
    color: fontColor['--t-font-color-danger'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type AiChatToolCallApprovalArgumentsEditorProps = {
  defaultArguments: Record<string, unknown>;
  readonly: boolean;
  onChange: (toolArguments: Record<string, unknown> | null) => void;
};

// tools without a dedicated card are edited as their raw arguments
export const AiChatToolCallApprovalArgumentsEditor = ({
  defaultArguments,
  readonly,
  onChange,
}: AiChatToolCallApprovalArgumentsEditorProps) => {
  const { t } = useLingui();
  const [text, setText] = useState(() =>
    JSON.stringify(defaultArguments, null, 2),
  );
  const [hasError, setHasError] = useState(false);

  const handleChange = (nextText: string) => {
    setText(nextText);

    const parsedArguments =
      parseAndValidateVariableFriendlyStringifiedJson(nextText);

    setHasError(!parsedArguments.isValid);
    onChange(parsedArguments.isValid ? parsedArguments.data : null);
  };

  return (
    <>
      <TextareaAutosize
        {...stylex.props(styles.textarea)}
        aria-label={t`Arguments`}
        minRows={3}
        maxRows={16}
        spellCheck={false}
        value={text}
        disabled={readonly}
        onChange={(event) => handleChange(event.target.value)}
      />
      {hasError && (
        <span role="alert" {...stylex.props(styles.error)}>
          {t`Arguments must be a valid JSON object.`}
        </span>
      )}
    </>
  );
};
