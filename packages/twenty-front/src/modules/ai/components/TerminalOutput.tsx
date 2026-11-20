import { monospaceFont } from '@/ui/theme/constants/MonospaceFontFamily.stylex';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconCopy, IconTerminal } from 'twenty-ui/icon';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const blink = stylex.keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0 },
  '100%': { opacity: 1 },
});

const styles = stylex.create({
  tab: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    borderStyle: 'none',
    paddingBlock: spacing['--t-spacing-0_5'],
    paddingInline: spacing['--t-spacing-1'],
    backgroundColor: {
      default: 'transparent',
      ':hover': background['--t-background-secondary'],
    },
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  tabActive: {
    backgroundColor: background['--t-background-secondary'],
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  tabError: {
    color: color['--t-color-red'],
  },
  outputArea: {
    padding: spacing['--t-spacing-2'],
    backgroundColor: background['--t-background-tertiary'],
    color: fontColor['--t-font-color-primary'],
    fontFamily: monospaceFont.family,
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '300px',
    minHeight: '100px',
    overflowY: 'auto',
  },
  outputAreaError: {
    color: color['--t-color-red'],
  },
  cursor: {
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationName: blink,
    animationTimingFunction: 'step-end',
    backgroundColor: fontColor['--t-font-color-primary'],
    display: 'inline-block',
    verticalAlign: 'text-bottom',
    height: '1em',
    marginLeft: '2px',
    width: '8px',
  },
  container: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
  header: {
    background: background['--t-background-tertiary'],
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
  },
  headerLeft: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
  },
  tabContainer: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
  },
  emptyMessage: {
    color: fontColor['--t-font-color-tertiary'],
    fontStyle: 'italic',
  },
});

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
          <button
            {...stylex.props(
              styles.tab,
              activeTab === 'stdout' && styles.tabActive,
            )}
            onClick={() => setUserSelectedTab('stdout')}
          >
            stdout
          </button>
          {hasStderr && (
            <button
              {...stylex.props(
                styles.tab,
                activeTab === 'stderr' && styles.tabActive,
                styles.tabError,
              )}
              onClick={() => setUserSelectedTab('stderr')}
            >
              stderr
            </button>
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
      <div
        {...stylex.props(
          styles.outputArea,
          activeTab === 'stderr' && styles.outputAreaError,
        )}
      >
        {currentOutput ? (
          <>
            {currentOutput}
            {isRunning && <span {...stylex.props(styles.cursor)} />}
          </>
        ) : (
          <div {...stylex.props(styles.emptyMessage)}>
            {isRunning ? t`Waiting for output...` : t`No output`}
          </div>
        )}
      </div>
    </div>
  );
};
