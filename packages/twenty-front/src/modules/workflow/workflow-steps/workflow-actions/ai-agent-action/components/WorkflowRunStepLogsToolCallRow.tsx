import { useState } from 'react';
import '@/workflow/workflow-steps/workflow-actions/components/workflowActionDescendantOverrides.css';
import { type AgentRunToolCallLog } from 'twenty-shared/ai';

import { useToolDisplayContext } from '@/ai/hooks/useToolDisplayContext';
import { getToolIcon } from '@/ai/utils/getToolIcon';
import { getToolDisplayMessage } from '@/ai/utils/tool-display/getToolDisplayMessage';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { JsonTree } from 'twenty-ui/components/data-display';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCircleX,
} from 'twenty-ui/icon';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import { type JsonValue } from 'type-fest';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import {
  iconSize,
  animationDuration,
  spacing,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  font,
  color,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  toggleButton: {
    background: 'none',
    borderStyle: 'none',
    gap: spacing['--t-spacing-1'],
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: 0,
    alignItems: 'center',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'default',
    display: 'flex',
    justifyContent: 'space-between',
    textAlign: 'left',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'color',
    transitionTimingFunction: 'ease-in-out',
    width: '100%',
  },
  toggleButtonExpandable: { cursor: 'pointer' },
  iconContainer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    minWidth: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  statusIconContainer: (color: string) => ({ color }),
  tab: {
    background: 'none',
    borderStyle: 'none',
    paddingInline: 0,
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingTop: 0,
  },
  tabActive: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  jsonTreeContainer: { overflowX: 'auto' },

  container: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--t-font-family'],
  },
  leftContent: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  rightContent: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
  },
  displayMessage: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  toolBadge: {
    background: backgroundTransparent['--t-background-transparent-light'],
    color: fontColor['--t-font-color-light'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-0_5'],
  },
  contentContainer: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    minWidth: '0',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
  tabContainer: {
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    marginBottom: spacing['--t-spacing-3'],
  },
  errorMessage: {
    color: color['--t-color-red'],
    fontSize: fontSize['--t-font-size-sm'],
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
});

type TabType = 'output' | 'input';

export const WorkflowRunStepLogsToolCallRow = ({
  toolCall,
}: {
  toolCall: AgentRunToolCallLog;
}) => {
  const theme = useTheme();
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('output');

  const hasError = toolCall.state === 'error';
  const hasOutput = isDefined(toolCall.output);
  const hasInput = isDefined(toolCall.input);
  const isExpandable = hasOutput || hasInput || hasError;

  const ToolIcon = getToolIcon(toolCall.toolName);
  const StatusIcon = hasError ? IconCircleX : IconCheck;
  const statusColor = hasError
    ? themeCssVariables.color.red
    : themeCssVariables.color.green;

  const displayContext = useToolDisplayContext();
  const displayMessage = getToolDisplayMessage({
    input: toolCall.input ?? {},
    toolName: toolCall.toolName,
    isFinished: true,
    displayContext,
    output: toolCall.output,
  });

  return (
    <div {...stylex.props(styles.container)}>
      <button
        type="button"
        {...stylex.props(
          styles.toggleButton,
          isExpandable && styles.toggleButtonExpandable,
        )}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
      >
        <div {...stylex.props(styles.leftContent)}>
          <div {...stylex.props(styles.iconContainer)}>
            <ToolIcon size={theme.icon.size.sm} />
          </div>
          <span {...stylex.props(styles.displayMessage)}>{displayMessage}</span>
        </div>
        <div {...stylex.props(styles.rightContent)}>
          <span {...stylex.props(styles.toolBadge)}>{toolCall.toolName}</span>
          <div
            {...stylex.props(
              styles.iconContainer,
              styles.statusIconContainer(statusColor),
            )}
          >
            <StatusIcon size={theme.icon.size.sm} />
          </div>
          {isExpandable &&
            (isExpanded ? (
              <IconChevronUp size={theme.icon.size.sm} />
            ) : (
              <IconChevronDown size={theme.icon.size.sm} />
            ))}
        </div>
      </button>

      {isExpandable && (
        <Collapsible.Root open={isExpanded}>
          <Collapsible.Panel>
            <div {...stylex.props(styles.contentContainer)}>
              {hasError && isDefined(toolCall.errorMessage) ? (
                <div {...stylex.props(styles.errorMessage)}>
                  {toolCall.errorMessage}
                </div>
              ) : (
                <>
                  <div {...stylex.props(styles.tabContainer)}>
                    <button
                      type="button"
                      {...stylex.props(
                        styles.tab,
                        activeTab === 'output' && styles.tabActive,
                      )}
                      onClick={() => setActiveTab('output')}
                    >
                      {t`Output`}
                    </button>
                    <button
                      type="button"
                      {...stylex.props(
                        styles.tab,
                        activeTab === 'input' && styles.tabActive,
                      )}
                      onClick={() => setActiveTab('input')}
                    >
                      {t`Input`}
                    </button>
                  </div>

                  <div
                    data-workflow-tool-call-json-tree
                    {...stylex.props(styles.jsonTreeContainer)}
                  >
                    <JsonTree
                      value={
                        (activeTab === 'output'
                          ? (toolCall.output ?? t`No output`)
                          : (toolCall.input ?? t`No input`)) as JsonValue
                      }
                      shouldExpandNodeInitially={() => false}
                      emptyArrayLabel={t`Empty Array`}
                      emptyObjectLabel={t`Empty Object`}
                      emptyStringLabel={t`[empty string]`}
                      arrowButtonCollapsedLabel={t`Expand`}
                      arrowButtonExpandedLabel={t`Collapse`}
                      onNodeValueClick={copyToClipboard}
                    />
                  </div>
                </>
              )}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
    </div>
  );
};
