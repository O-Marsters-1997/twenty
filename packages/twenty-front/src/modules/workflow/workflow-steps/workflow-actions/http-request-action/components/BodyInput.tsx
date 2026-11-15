import { FormRawJsonFieldInput } from '@/object-record/record-field/ui/form-types/components/FormRawJsonFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { Select } from '@/ui/input/components/Select';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import {
  BODY_TYPES,
  DEFAULT_JSON_BODY_PLACEHOLDER,
  type HttpRequestBody,
  type HttpRequestFormData,
} from '@/workflow/workflow-steps/workflow-actions/http-request-action/constants/HttpRequest';
import { getBodyTypeFromHeaders } from '@/workflow/workflow-steps/workflow-actions/http-request-action/utils/getBodyTypeFromHeaders';
import { parseHttpJsonBodyWithoutVariablesOrThrow } from '@/workflow/workflow-steps/workflow-actions/http-request-action/utils/parseHttpJsonBodyWithoutVariablesOrThrow';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { isString } from '@sniptt/guards';
import { useState } from 'react';
import { isDefined, parseJson } from 'twenty-shared/utils';
import {
  CONTENT_TYPE_VALUES_HTTP_REQUEST,
  type BodyType,
} from 'twenty-shared/workflow';
import { IconFileText, IconKey } from 'twenty-ui/icon';
import { type JsonValue } from 'type-fest';
import { KeyValuePairInput } from './KeyValuePairInput';
import * as stylex from '@stylexjs/stylex';
import { spacing, fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
  },
  selectDropdownContainer: {
    marginBottom: spacing['--t-spacing-2'],
  },
  noBodyMessage: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-md'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    textAlign: 'left',
  },
});

type BodyInputProps = {
  label?: string;
  defaultValue?: HttpRequestBody | string;
  onChange: (
    value?: string | Record<string, string>,
    type?: keyof HttpRequestFormData,
  ) => void;
  readonly?: boolean;
  headers?: Record<string, string>;
};

export const BodyInput = ({
  defaultValue,
  onChange,
  readonly,
  headers,
}: BodyInputProps) => {
  const defaultValueParsed = isString(defaultValue)
    ? (parseJson<JsonValue>(defaultValue) ?? {})
    : defaultValue;

  const isBodyTypeRawJson =
    getBodyTypeFromHeaders(headers) === BODY_TYPES.RAW_JSON;
  const [jsonString, setJsonString] = useState<string | null>(
    isBodyTypeRawJson
      ? isString(defaultValue)
        ? defaultValue
        : JSON.stringify(defaultValue, null, 2)
      : null,
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [textValue, setTextValue] = useState<string | undefined>(
    getBodyTypeFromHeaders(headers) === BODY_TYPES.TEXT &&
      isString(defaultValue)
      ? defaultValue
      : undefined,
  );

  const handleChangeTextValue = (text: string) => {
    setTextValue(text);

    onChange(text);
  };

  const validateJson = (value: string | null): boolean => {
    if (!value?.trim()) {
      setErrorMessage(undefined);
      return true;
    }

    try {
      parseHttpJsonBodyWithoutVariablesOrThrow(value);

      setErrorMessage(undefined);
      return true;
    } catch (e) {
      setErrorMessage(String(e));
      return false;
    }
  };

  const handleKeyValueChange = (value: Record<string, string>) => {
    onChange(JSON.stringify(value, null, 2));
    setErrorMessage(undefined);
  };

  const handleJsonChange = (value: string | null) => {
    setJsonString(value);

    if (!value?.trim()) {
      onChange();
      setErrorMessage(undefined);
      return;
    }

    try {
      parseHttpJsonBodyWithoutVariablesOrThrow(value);

      onChange(value);
    } catch {
      // Do nothing, validation will happen on blur
    }
  };
  const resetBodyStateValue = (bodyTypeValue: BodyType) => {
    if (bodyTypeValue === BODY_TYPES.RAW_JSON && isDefined(jsonString)) {
      setJsonString(null);
      setErrorMessage(undefined);
    } else if (bodyTypeValue === BODY_TYPES.TEXT && isDefined(textValue)) {
      setTextValue(undefined);
    }
  };
  const handleModeChange = (bodyTypeValue: BodyType) => {
    if (
      bodyTypeValue === BODY_TYPES.NONE &&
      isDefined(headers?.['content-type'])
    ) {
      const headersCopy = { ...headers };
      delete headersCopy['content-type'];
      onChange(headersCopy, 'headers');
    } else if (
      bodyTypeValue !== BODY_TYPES.NONE &&
      getBodyTypeFromHeaders(headers) !== bodyTypeValue
    ) {
      const newHeaders = {
        ...headers,
        'content-type': CONTENT_TYPE_VALUES_HTTP_REQUEST[bodyTypeValue],
      };
      resetBodyStateValue(bodyTypeValue);
      onChange(newHeaders, 'headers');
    }
  };

  const handleBlur = () => {
    if (isBodyTypeRawJson) {
      validateJson(jsonString);
    }
  };

  return (
    <FormFieldInputContainer>
      <InputLabel>{t`Body Input`}</InputLabel>
      <div {...stylex.props(styles.selectDropdownContainer)}>
        <Select
          options={[
            { label: t`Key/Value`, value: BODY_TYPES.KEY_VALUE, Icon: IconKey },
            {
              label: t`Raw JSON`,
              value: BODY_TYPES.RAW_JSON,
              Icon: IconFileText,
            },
            { label: t`Form Data`, value: BODY_TYPES.FORM_DATA, Icon: IconKey },
            { label: t`Text`, value: BODY_TYPES.TEXT, Icon: IconFileText },
            { label: t`None`, value: BODY_TYPES.NONE, Icon: IconFileText },
          ]}
          dropdownId="body-input-mode"
          value={getBodyTypeFromHeaders(headers) || BODY_TYPES.NONE}
          onChange={(value) => handleModeChange(value as BodyType)}
          disabled={readonly}
        />
      </div>

      <div {...stylex.props(styles.container)}>
        {isBodyTypeRawJson ? (
          <FormRawJsonFieldInput
            placeholder={DEFAULT_JSON_BODY_PLACEHOLDER}
            readonly={readonly}
            defaultValue={jsonString}
            error={errorMessage}
            onBlur={handleBlur}
            onChange={handleJsonChange}
            VariablePicker={WorkflowVariablePicker}
          />
        ) : getBodyTypeFromHeaders(headers) === BODY_TYPES.KEY_VALUE ? (
          <KeyValuePairInput
            key={'keyValuePair'}
            defaultValue={defaultValueParsed as Record<string, string>}
            onChange={handleKeyValueChange}
            readonly={readonly}
            keyPlaceholder={t`Property name`}
            valuePlaceholder={t`Property value`}
          />
        ) : getBodyTypeFromHeaders(headers) === BODY_TYPES.FORM_DATA ? (
          <KeyValuePairInput
            key={'FormDataPair'}
            defaultValue={defaultValueParsed as Record<string, string>}
            onChange={handleKeyValueChange}
            readonly={readonly}
            keyPlaceholder={t`Property name`}
            valuePlaceholder={t`Property value`}
          />
        ) : getBodyTypeFromHeaders(headers) === BODY_TYPES.TEXT ? (
          <FormTextFieldInput
            placeholder={t`Enter text`}
            readonly={readonly}
            defaultValue={textValue}
            onChange={(value: string) => handleChangeTextValue(value)}
            VariablePicker={WorkflowVariablePicker}
          />
        ) : (
          <div {...stylex.props(styles.noBodyMessage)}>{t`No body`}</div>
        )}
      </div>
    </FormFieldInputContainer>
  );
};
