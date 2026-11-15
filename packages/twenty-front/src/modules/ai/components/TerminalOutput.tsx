import { MONOSPACE_FONT_FAMILY } from '@/ui/theme/constants/MonospaceFontFamily';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconCopy, IconTerminal } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor, borderRadius, fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    background: background['--t-background-tertiary'],
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-medium'],
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  headerLeft: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-1'],
  },
  tabContainer: {
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  emptyMessage: {
    color: fontColor['--t-font-color-tertiary'],
    fontStyle: 'italic',
  },
});

const StyledTab = styled.button<{ isActive: boolean; hasError?: boolean }>`
  background: ${({ isActive }) =>
    isActive ? themeCssVariables.background.secondary : 'transparent'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.xs};
  color: ${({ isActive, hasError }) =>
    hasError
      ? themeCssVariables.color.red
      : isActive
        ? themeCssVariables.font.color.primary
        : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  padding: ${themeCssVariables.spacing['0.5']} ${themeCssVariables.spacing[1]};

  &:hover {
    background: ${themeCssVariables.background.secondary};
    color: ${({ hasError }) =>
      hasError
        ? themeCssVariables.color.red
        : themeCssVariables.font.color.primary};
  }
`;

const StyledOutputArea = styled.div<{ isError?: boolean }>`
  background: ${themeCssVariables.background.tertiary};
  color: ${({ isError }) =>
    isError
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.primary};
  font-family: ${MONOSPACE_FONT_FAMILY};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  max-height: 300px;
  min-height: 100px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]};
  white-space: pre-wrap;
  word-break: break-word;
`;

const StyledCursor = styled.span`
  animation: blink 1s step-end infinite;
  background: ${themeCssVariables.font.color.primary};
  display: inline-block;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  width: 8px;

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
`;

type TabType = 'stdout' | 'stderr';

type TerminalOutputProps = {
  stdout: string;
  stderr: string;
  isRunning?: boolean;
};

export const TerminalOutput = ({
  stdout,
  stderr,
  isRunning = false,
}: TerminalOutputProps) => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();

  const hasStderr = stderr.length > 0;
  const hasStdout = stdout.length > 0;

  const defaultTab: TabType = hasStderr && !hasStdout ? 'stderr' : 'stdout';
  const [userSelectedTab, setUserSelectedTab] = useState<TabType | null>(null);
  const activeTab = userSelectedTab ?? defaultTab;

  const currentOutput = activeTab === 'stdout' ? stdout : stderr;

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerLeft)}>
          <IconTerminal size={14} />
          {t`Output`}
        </div>
        <div {...stylex.props(styles.tabContainer)}>
          <StyledTab
            isActive={activeTab === 'stdout'}
            onClick={() => setUserSelectedTab('stdout')}
          >
            stdout
          </StyledTab>
          {hasStderr && (
            <StyledTab
              isActive={activeTab === 'stderr'}
              hasError
              onClick={() => setUserSelectedTab('stderr')}
            >
              stderr
            </StyledTab>
          )}
          <LightIconButton
            onClick={() => copyToClipboard(currentOutput)}
            title={t`Copy output`}
            size="sm"
            emphasis="subtle"
            aria-label={t`Copy output`}
          >
            <IconCopy />
          </LightIconButton>
        </div>
      </div>
      <StyledOutputArea isError={activeTab === 'stderr'}>
        {currentOutput ? (
          <>
            {currentOutput}
            {isRunning && <StyledCursor />}
          </>
        ) : (
          <div {...stylex.props(styles.emptyMessage)}>
            {isRunning ? t`Waiting for output...` : t`No output`}
          </div>
        )}
      </StyledOutputArea>
    </div>
  );
};
