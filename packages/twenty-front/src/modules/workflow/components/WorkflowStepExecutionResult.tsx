import { LightCopyIconButton } from '@/ui/input/components/LightCopyIconButton';
import { AnimatedCircleLoading } from '@/workflow/components/internal/AnimatedCircleLoading/AnimatedCircleLoading';
import { t } from '@lingui/core/macro';
import { CodeEditor, CodeEditorHeader } from 'twenty-ui/components/code-editor';
import {
  IconLoader,
  IconSquareRoundedCheck,
  IconSquareRoundedX,
} from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  fontColor,
  fontSize,
  color,
} from 'twenty-ui/theme/tokens.stylex';
const styles = stylex.create({
  output: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  outputSuccess: { color: color['--t-color-turquoise'] },
  outputError: { color: color['--t-color-red'] },
  container: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
  },
  codeEditorWrapper: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
  },
  infoContainer: {
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
  },
  statusInfo: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-2'],
  },
});

export type ExecutionStatus = {
  isSuccess: boolean;
  isError: boolean;
  successMessage?: string;
  errorMessage?: string;
  additionalInfo?: string;
};

type WorkflowStepExecutionResultProps = {
  result: string;
  language: 'plaintext' | 'json';
  height?: string | number;
  status: ExecutionStatus;
  isTesting?: boolean;
  loadingMessage?: string;
  idleMessage?: string;
};

export const WorkflowStepExecutionResult = ({
  result,
  language,
  height = '100%',
  status,
  isTesting = false,
  loadingMessage = t`Processing...`,
  idleMessage = t`Output`,
}: WorkflowStepExecutionResultProps) => {
  const theme = useTheme();

  const SuccessLeftNode = (
    <div {...stylex.props(styles.output, styles.outputSuccess)}>
      <IconSquareRoundedCheck size={theme.icon.size.md} />
      <div>
        <div>{status.successMessage}</div>
        {status.additionalInfo && (
          <div {...stylex.props(styles.statusInfo)}>
            {status.additionalInfo}
          </div>
        )}
      </div>
    </div>
  );

  const ErrorLeftNode = (
    <div {...stylex.props(styles.output, styles.outputError)}>
      <IconSquareRoundedX size={theme.icon.size.md} />
      <div>
        <div>{status.errorMessage}</div>
        {status.additionalInfo && (
          <div {...stylex.props(styles.statusInfo)}>
            {status.additionalInfo}
          </div>
        )}
      </div>
    </div>
  );

  const IdleLeftNode = idleMessage;

  const PendingLeftNode = isTesting && (
    <div {...stylex.props(styles.output)}>
      <AnimatedCircleLoading>
        <IconLoader size={theme.icon.size.md} />
      </AnimatedCircleLoading>
      <div {...stylex.props(styles.infoContainer)}>{loadingMessage}</div>
    </div>
  );

  const computeLeftNode = () => {
    if (isTesting) {
      return PendingLeftNode;
    }
    if (status.isError) {
      return ErrorLeftNode;
    }
    if (status.isSuccess) {
      return SuccessLeftNode;
    }
    return IdleLeftNode;
  };

  return (
    <div {...stylex.props(styles.container)}>
      <CodeEditorHeader
        startElement={computeLeftNode()}
        endElement={<LightCopyIconButton copyText={result} />}
      />
      <div {...stylex.props(styles.codeEditorWrapper)}>
        <CodeEditor
          resizable={true}
          resizeLabel={t`Resize output`}
          value={result}
          language={language}
          height={height}
          options={{ readOnly: true, domReadOnly: true }}
          isLoading={isTesting}
          variant="with-header"
        />
      </div>
    </div>
  );
};
