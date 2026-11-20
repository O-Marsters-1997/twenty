import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { getToolName, type DynamicToolUIPart, type ToolUIPart } from 'ai';
import { useState } from 'react';
import { isDefined, isNonEmptyArray, isPlainObject } from 'twenty-shared/utils';
import { JsonTree } from 'twenty-ui/components/data-display';
import { IconChevronRight } from 'twenty-ui/icon';
import { Collapsible } from 'twenty-ui/primitives/layout';
import { Tabs } from 'twenty-ui/primitives/navigation';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type JsonValue } from 'type-fest';

import { ShimmeringText } from '@/ai/components/ShimmeringText';
import { ToolRecordsWidget } from '@/ai/components/ToolRecordsWidget';
import { useToolDisplayContext } from '@/ai/hooks/useToolDisplayContext';
import { getToolIcon } from '@/ai/utils/getToolIcon';
import { getToolRecordOutput } from '@/ai/utils/getToolRecordOutput';
import { getToolDisplayMessage } from '@/ai/utils/tool-display/getToolDisplayMessage';
import { unwrapToolInput } from '@/ai/utils/tool-display/unwrapToolInput';
import { TabList } from '@/ui/layout/tab-list/components/TabList';
import { TabListRoot } from '@/ui/layout/tab-list/components/TabListRoot';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  iconSize,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';
import '~/third-party-styles/ai-chat-content.css';

const styles = stylex.create({
  chevron: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    justifyContent: 'center',
    transform: 'rotate(0deg)',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-in-out',
  },
  chevronExpanded: {
    transform: 'rotate(90deg)',
  },
  toolRowButton: {
    borderStyle: 'none',
    gap: spacing['--t-spacing-2'],
    outline: {
      default: null,
      ':focus-visible': `2px solid ${color['--t-color-blue']}`,
    },
    paddingBlock: 0,
    paddingInline: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'default',
    display: 'flex',
    fontFamily: 'inherit',
    outlineOffset: { default: null, ':focus-visible': '2px' },
    textAlign: 'left',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'color',
    transitionTimingFunction: 'ease-in-out',
    minHeight: '24px',
    width: '100%',
  },
  toolRowButtonExpandable: {
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
  },
  shimmeringLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  toolRowLabel: {
    overflow: 'hidden',
    transition: `color calc(${animationDuration['--t-animation-duration-fast']} * 1s)
    ease-in-out`,
    color: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-md'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    minWidth: '0',
  },
  iconContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    justifyContent: 'center',
    minWidth: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  rowLabelContainer: {
    flex: '1',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  toolRowContainer: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
  },
  toolDetailsContainer: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    overflow: 'hidden',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    marginLeft: spacing['--t-spacing-3'],
    minWidth: '0',
  },
  toolRecordsContainer: {
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: '0',
  },
  toolTabListContainer: {
    backgroundColor: background['--t-background-secondary'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  toolDetailsContent: {
    minWidth: '0',
  },
  toolJsonContent: {
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
  toolErrorText: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
    whiteSpace: 'pre-wrap',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
  },
});

type ToolDetailsTab = 'output' | 'input';

type ThinkingToolStepRowProps = {
  isActive: boolean;
  part: ToolUIPart | DynamicToolUIPart;
};

export const ThinkingToolStepRow = ({
  isActive,
  part,
}: ThinkingToolStepRowProps) => {
  const { copyToClipboard } = useCopyToClipboard();
  const [isExpanded, setIsExpanded] = useState(false);
  const rawToolName = getToolName(part);
  const { toolInput, toolName } = unwrapToolInput({
    input: part.input,
    toolName: rawToolName,
  });

  const displayContext = useToolDisplayContext();
  const ToolIcon = getToolIcon(toolName);
  const displayMessage = getToolDisplayMessage({
    input: part.input,
    toolName: rawToolName,
    isFinished: !isActive,
    displayContext,
    output: part.output,
  });
  const hasError = isDefined(part.errorText);
  const { message: recordsMessage, recordReferences } =
    getToolRecordOutput(part);
  const isExpandable = isDefined(part.output) || hasError;

  const toolOutput =
    isPlainObject(part.output) && isNonEmptyString(part.output.error)
      ? { error: part.output.error }
      : part.output;
  const toolTabListComponentInstanceId = `ai-thinking-tool-tabs-${part.toolCallId ?? rawToolName}`;
  const activeTabId = useAtomComponentStateValue(
    activeTabIdComponentState,
    toolTabListComponentInstanceId,
  );
  const activeTab: ToolDetailsTab =
    activeTabId === 'input' ? 'input' : 'output';
  const toolTabs = [
    { id: 'output', title: t`Output` },
    { id: 'input', title: t`Input` },
  ];

  return (
    <div {...stylex.props(styles.toolRowContainer)}>
      <button
        type="button"
        {...stylex.props(
          styles.toolRowButton,
          isExpandable && styles.toolRowButtonExpandable,
        )}
        onClick={() => {
          if (!isExpandable) {
            return;
          }

          setIsExpanded((previousValue) => !previousValue);
        }}
        aria-expanded={isExpandable ? isExpanded : undefined}
      >
        <div {...stylex.props(styles.iconContainer)}>
          <ToolIcon size={14} />
        </div>
        <div {...stylex.props(styles.rowLabelContainer)}>
          <div {...stylex.props(styles.toolRowLabel)}>
            {isActive ? (
              <ShimmeringText xstyle={styles.shimmeringLabel}>
                {displayMessage}
              </ShimmeringText>
            ) : (
              <OverflowingTextWithTooltip
                text={displayMessage}
                tooltipDelay={TooltipDelay.shortDelay}
              />
            )}
          </div>
          {isExpandable && (
            <div
              {...stylex.props(
                styles.chevron,
                isExpanded && styles.chevronExpanded,
              )}
            >
              <IconChevronRight size={14} />
            </div>
          )}
        </div>
      </button>

      {isExpandable && (
        <Collapsible.Root open={isExpanded}>
          <Collapsible.Panel>
            <div {...stylex.props(styles.toolDetailsContainer)}>
              {isNonEmptyArray(recordReferences) && (
                <div {...stylex.props(styles.toolRecordsContainer)}>
                  <ToolRecordsWidget
                    message={recordsMessage ?? ''}
                    recordReferences={recordReferences}
                  />
                </div>
              )}
              {hasError ? (
                <p {...stylex.props(styles.toolErrorText)}>{part.errorText}</p>
              ) : (
                <TabListRoot
                  componentInstanceId={toolTabListComponentInstanceId}
                >
                  <div {...stylex.props(styles.toolDetailsContent)}>
                    <div {...stylex.props(styles.toolTabListContainer)}>
                      <TabList
                        aria-label={t`Tool details: ${displayMessage}`}
                        tabs={toolTabs}
                        behaveAsLinks={false}
                        componentInstanceId={toolTabListComponentInstanceId}
                      />
                    </div>
                    <Tabs.Panel
                      value={activeTab}
                      render={<div {...stylex.props(styles.toolJsonContent)} />}
                    >
                      <div className="json-tree-container">
                        <JsonTree
                          value={
                            (activeTab === 'output'
                              ? toolOutput
                              : toolInput) as JsonValue
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
                    </Tabs.Panel>
                  </div>
                </TabListRoot>
              )}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
    </div>
  );
};
