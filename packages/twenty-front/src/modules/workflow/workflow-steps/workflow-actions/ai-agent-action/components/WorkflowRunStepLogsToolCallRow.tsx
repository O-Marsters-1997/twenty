import { styled } from '@linaria/react';
import { useState } from 'react';
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
import { font, spacing, background, border, color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--t-font-family'],
    gap: spacing['--t-spacing-2'],
  },
  leftContent: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    minWidth: '0',
  },
  rightContent: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    gap: spacing['--t-spacing-2'],
  },
  displayMessage: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  toolBadge: {
    background: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-xs'],
    borderTopRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomRightRadius: borderRadius['--t-border-radius-xs'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-xs'],
    color: fontColor['--t-font-color-light'],
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-xs'],
    paddingTop: spacing['--t-spacing-0_5'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  contentContainer: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    minWidth: '0',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  tabContainer: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    marginBottom: spacing['--t-spacing-3'],
  },
  errorMessage: {
    color: color['--t-color-red'],
    fontSize: fontSize['--t-font-size-sm'],
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
});

const StyledToggleButton = styled.button<{ isExpandable: boolean }>`
  align-items: center;
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.tertiary};
  cursor: ${({ isExpandable }) => (isExpandable ? 'pointer' : 'default')};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[1]} 0;
  text-align: left;
  transition: color calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease-in-out;
  width: 100%;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledIconContainer = styled.div`
  align-items: center;
  display: flex;

  svg {
    min-width: calc(${themeCssVariables.icon.size.sm} * 1px);
  }
`;

const StyledTab = styled.button<{ isActive: boolean }>`
  background: none;
  border: none;
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ isActive }) =>
    isActive
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  padding: 0 0 ${themeCssVariables.spacing[2]};

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledJsonTreeContainer = styled.div`
  overflow-x: auto;

  ul {
    min-width: 0;
  }
`;

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
      <StyledToggleButton
        type="button"
        isExpandable={isExpandable}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
      >
        <div {...stylex.props(styles.leftContent)}>
          <StyledIconContainer>
            <ToolIcon size={theme.icon.size.sm} />
          </StyledIconContainer>
          <span {...stylex.props(styles.displayMessage)}>{displayMessage}</span>
        </div>
        <div {...stylex.props(styles.rightContent)}>
          <span {...stylex.props(styles.toolBadge)}>{toolCall.toolName}</span>
          <StyledIconContainer style={{ color: statusColor }}>
            <StatusIcon size={theme.icon.size.sm} />
          </StyledIconContainer>
          {isExpandable &&
            (isExpanded ? (
              <IconChevronUp size={theme.icon.size.sm} />
            ) : (
              <IconChevronDown size={theme.icon.size.sm} />
            ))}
        </div>
      </StyledToggleButton>

      {isExpandable && (
        <Collapsible.Root open={isExpanded}>
          <Collapsible.Panel>
            <div {...stylex.props(styles.contentContainer)}>
              {hasError && isDefined(toolCall.errorMessage) ? (
                <div {...stylex.props(styles.errorMessage)}>{toolCall.errorMessage}</div>
              ) : (
                <>
                  <div {...stylex.props(styles.tabContainer)}>
                    <StyledTab
                      type="button"
                      isActive={activeTab === 'output'}
                      onClick={() => setActiveTab('output')}
                    >
                      {t`Output`}
                    </StyledTab>
                    <StyledTab
                      type="button"
                      isActive={activeTab === 'input'}
                      onClick={() => setActiveTab('input')}
                    >
                      {t`Input`}
                    </StyledTab>
                  </div>

                  <StyledJsonTreeContainer>
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
                  </StyledJsonTreeContainer>
                </>
              )}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
    </div>
  );
};
