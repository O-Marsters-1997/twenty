import { TabListRoot } from '@/ui/layout/tab-list/components/TabListRoot';
import '@/workflow/workflow-steps/workflow-actions/components/workflowActionDescendantOverrides.css';
import { WorkflowStepTabPanel } from '@/workflow/workflow-steps/components/WorkflowStepTabPanel';
import { FormRawJsonFieldInput } from '@/object-record/record-field/ui/form-types/components/FormRawJsonFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { Select } from '@/ui/input/components/Select';
import { type WorkflowHttpRequestAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';

import { WorkflowStepCmdEnterButton } from '@/workflow/workflow-steps/components/WorkflowStepCmdEnterButton';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { TabList } from '@/ui/layout/tab-list/components/TabList';
import { activeTabIdComponentState } from '@/ui/layout/tab-list/states/activeTabIdComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { getBodyTypeFromHeaders } from '@/workflow/workflow-steps/workflow-actions/http-request-action/utils/getBodyTypeFromHeaders';
import { isMethodWithBody } from '@/workflow/workflow-steps/workflow-actions/http-request-action/utils/isMethodWithBody';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';
import { IconPlayerPlay, IconSettings } from 'twenty-ui/icon';
import {
  HTTP_METHODS,
  JSON_RESPONSE_PLACEHOLDER,
} from '@/workflow/workflow-steps/workflow-actions/http-request-action/constants/HttpRequest';
import { WORKFLOW_HTTP_REQUEST_TAB_LIST_COMPONENT_ID } from '@/workflow/workflow-steps/workflow-actions/http-request-action/constants/WorkflowHttpRequestTabListComponentId';
import { useHttpRequestForm } from '@/workflow/workflow-steps/workflow-actions/http-request-action/hooks/useHttpRequestForm';
import { useHttpRequestOutputSchema } from '@/workflow/workflow-steps/workflow-actions/http-request-action/hooks/useHttpRequestOutputSchema';
import { useTestHttpRequest } from '@/workflow/workflow-steps/workflow-actions/http-request-action/hooks/useTestHttpRequest';
import { WorkflowHttpRequestTabId } from '@/workflow/workflow-steps/workflow-actions/http-request-action/types/WorkflowHttpRequestTabId';
import { BodyInput } from './BodyInput';
import { HttpRequestExecutionResult } from './HttpRequestExecutionResult';
import { HttpRequestTestVariableInput } from './HttpRequestTestVariableInput';
import { KeyValuePairInput } from './KeyValuePairInput';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing, background } from 'twenty-ui/theme/tokens.stylex';
type WorkflowEditActionHttpRequestProps = {
  action: WorkflowHttpRequestAction;
  actionOptions: {
    readonly?: boolean;
    onActionUpdate?: (action: WorkflowHttpRequestAction) => void;
  };
};

const styles = stylex.create({
  fullHeightJsonField: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
  },

  tabListContainer: {
    backgroundColor: background['--t-background-secondary'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  testTabContent: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    height: '100%',
    minHeight: '400px',
  },
  configurationTabContent: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-4'],
    height: '100%',
  },
});

export const WorkflowEditActionHttpRequest = ({
  action,
  actionOptions,
}: WorkflowEditActionHttpRequestProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const activeTabId = useAtomComponentStateValue(
    activeTabIdComponentState,
    WORKFLOW_HTTP_REQUEST_TAB_LIST_COMPONENT_ID,
  );

  const { formData, handleFieldChange, saveAction } = useHttpRequestForm({
    action,
    onActionUpdate: actionOptions.onActionUpdate,
    readonly: actionOptions.readonly === true,
  });
  const { outputSchema, handleOutputSchemaChange, error } =
    useHttpRequestOutputSchema({
      action,
      onActionUpdate: actionOptions.onActionUpdate,
      readonly: actionOptions.readonly === true,
    });
  const { testHttpRequest, isTesting, httpRequestTestData } =
    useTestHttpRequest(action.id);

  const handleTestRequest = async () => {
    if (actionOptions.readonly === true) {
      return;
    }
    await testHttpRequest(formData, httpRequestTestData.variableValues);
  };

  const tabs = [
    {
      id: WorkflowHttpRequestTabId.CONFIGURATION,
      title: t`Configuration`,
      Icon: IconSettings,
    },
    { id: WorkflowHttpRequestTabId.TEST, title: t`Test`, Icon: IconPlayerPlay },
  ];

  useEffect(() => () => saveAction.flush(), [saveAction]);

  return (
    <TabListRoot
      componentInstanceId={WORKFLOW_HTTP_REQUEST_TAB_LIST_COMPONENT_ID}
    >
      <div {...stylex.props(styles.tabListContainer)}>
        <TabList
          aria-label={t`HTTP request`}
          tabs={tabs}
          behaveAsLinks={false}
          componentInstanceId={WORKFLOW_HTTP_REQUEST_TAB_LIST_COMPONENT_ID}
        />
      </div>
      <WorkflowStepTabPanel value={activeTabId ?? ''}>
        <WorkflowStepBody>
          {activeTabId === WorkflowHttpRequestTabId.CONFIGURATION && (
            <div {...stylex.props(styles.configurationTabContent)}>
              <FormTextFieldInput
                label={t`URL`}
                placeholder={t`https://api.example.com/endpoint`}
                readonly={actionOptions.readonly}
                defaultValue={formData.url}
                onChange={(value) => handleFieldChange('url', value)}
                VariablePicker={WorkflowVariablePicker}
              />
              <Select
                label={t`HTTP Method`}
                dropdownId="http-method"
                options={[...HTTP_METHODS]}
                value={formData.method}
                onChange={(value) => handleFieldChange('method', value)}
                disabled={actionOptions.readonly}
                dropdownSideOffset={parseInt(theme.spacing[1], 10)}
                dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
              />

              <KeyValuePairInput
                key={getBodyTypeFromHeaders(formData.headers) || 'none'}
                label={t`Headers Input`}
                defaultValue={formData.headers}
                onChange={(value) => handleFieldChange('headers', value)}
                readonly={actionOptions.readonly}
                keyPlaceholder={t`Header name`}
                valuePlaceholder={t`Header value`}
              />

              {isMethodWithBody(formData.method) && (
                <BodyInput
                  defaultValue={formData.body}
                  onChange={(value, type = 'body') =>
                    handleFieldChange(type, value)
                  }
                  readonly={actionOptions.readonly}
                  headers={formData.headers}
                />
              )}

              <div
                data-workflow-full-height-json-field
                {...stylex.props(styles.fullHeightJsonField)}
              >
                <FormRawJsonFieldInput
                  label={t`Expected Response Body`}
                  placeholder={JSON_RESPONSE_PLACEHOLDER}
                  defaultValue={outputSchema}
                  onChange={handleOutputSchemaChange}
                  readonly={actionOptions.readonly}
                  error={error}
                />
              </div>
            </div>
          )}
          {activeTabId === WorkflowHttpRequestTabId.TEST && (
            <div {...stylex.props(styles.testTabContent)}>
              <HttpRequestTestVariableInput
                httpRequestFormData={formData}
                actionId={action.id}
                readonly={actionOptions.readonly}
              />
              <HttpRequestExecutionResult
                httpRequestTestData={httpRequestTestData}
                isTesting={isTesting}
              />
            </div>
          )}
        </WorkflowStepBody>
      </WorkflowStepTabPanel>
      {!actionOptions.readonly && (
        <WorkflowStepFooter
          stepId={action.id}
          additionalActions={
            activeTabId === WorkflowHttpRequestTabId.TEST
              ? [
                  <WorkflowStepCmdEnterButton
                    title={t`Test`}
                    onClick={handleTestRequest}
                    disabled={isTesting}
                  />,
                ]
              : []
          }
        />
      )}
    </TabListRoot>
  );
};
