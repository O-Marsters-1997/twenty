import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Fragment, useState } from 'react';
import { VALIDATION_RULE_NOW_VARIABLE_NAME } from 'twenty-shared/constants';
import { type ValidationRuleFieldDescriptor } from 'twenty-shared/types';
import {
  compileValidationRuleExpression,
  evaluateValidationRuleExpression,
  isDefined,
  parseValidationRuleExpression,
} from 'twenty-shared/utils';
import { InlineBanner } from 'twenty-ui/components/feedback';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronDown, IconChevronUp, useIcons } from 'twenty-ui/icon';
import { Status } from 'twenty-ui/primitives/data-display';
import { Card, Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';

import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { RecordChip } from '@/object-record/components/RecordChip';
import { generateDepthRecordGqlFieldsFromObject } from '@/object-record/graphql/record-gql-fields/utils/generateDepthRecordGqlFieldsFromObject';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { StyledFormCardTitle } from '@/settings/data-model/fields/components/StyledFormCardTitle';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { type ValidationRuleEditorField } from '@/validation-rules/types/ValidationRuleEditorField';
import { buildValidationRulePreviewRelationGqlFields } from '@/validation-rules/utils/buildValidationRulePreviewRelationGqlFields';
import { formatValidationRulePreviewValue } from '@/validation-rules/utils/formatValidationRulePreviewValue';
import { getValidationRuleEditorFieldChipLabel } from '@/validation-rules/utils/getValidationRuleEditorFieldChipLabel';
import { getValidationRulePreviewValue } from '@/validation-rules/utils/getValidationRulePreviewValue';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const PREVIEW_RECORD_COUNT = 3;

const styles = stylex.create({
  previewTitle: {
    marginBottom: 0,
  },
  muted: {
    color: fontColor['--t-font-color-light'],
  },
  fieldValuesPlaceholder: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: '24px',
    marginTop: spacing['--t-spacing-2'],
  },
  fieldLabel: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  fieldLabelIcon: {
    flexShrink: 0,
  },
  value: {
    color: fontColor['--t-font-color-primary'],
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  valueEmpty: {
    color: fontColor['--t-font-color-light'],
  },
  previewHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    marginBottom: spacing['--t-spacing-4'],
    minHeight: '24px',
  },
  recordHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    minWidth: '0',
  },
  record: {
    display: 'flex',
    minWidth: '0',
    overflow: 'hidden',
  },
  status: {
    flexShrink: '0',
  },
  navigation: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-1'],
  },
  fieldValues: {
    columnGap: spacing['--t-spacing-2'],
    display: 'grid',
    fontSize: fontSize['--t-font-size-md'],
    gridTemplateColumns: 'fit-content(50%) minmax(0, 1fr)',
    lineHeight: '24px',
    marginTop: spacing['--t-spacing-2'],
    rowGap: spacing['--t-spacing-1'],
  },
  errorMessage: {
    marginTop: spacing['--t-spacing-3'],
  },
});

type SettingsValidationRulePreviewProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  fields: ValidationRuleFieldDescriptor[];
  editorFields: ValidationRuleEditorField[];
  expression: string;
  message: string;
};

export const SettingsValidationRulePreview = ({
  objectMetadataItem,
  fields,
  editorFields,
  expression,
  message,
}: SettingsValidationRulePreviewProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const { getIcon } = useIcons();
  const { objectMetadataItems } = useObjectMetadataItems();
  const [recordIndex, setRecordIndex] = useState(0);

  const compilationResult = compileValidationRuleExpression({
    expression,
    fields,
  });

  const { records, loading } = useFindManyRecords({
    objectNameSingular: objectMetadataItem.nameSingular,
    limit: PREVIEW_RECORD_COUNT,
    orderBy: [{ createdAt: 'DescNullsLast' }],
    recordGqlFields: {
      ...generateDepthRecordGqlFieldsFromObject({
        objectMetadataItems,
        objectMetadataItem,
        depth: 0,
      }),
      ...buildValidationRulePreviewRelationGqlFields({
        bindingPaths: compilationResult.isValid
          ? Object.keys(compilationResult.bindings)
          : [],
        fields,
      }),
    },
  });

  const previewTitle = (
    <StyledFormCardTitle {...stylex.props(styles.previewTitle)}>
      <Trans>Preview</Trans>
    </StyledFormCardTitle>
  );

  if (loading) {
    return <div {...stylex.props(styles.previewHeader)}>{previewTitle}</div>;
  }

  const record = records[Math.min(recordIndex, records.length - 1)];

  if (!isDefined(record)) {
    return (
      <>
        <div {...stylex.props(styles.previewHeader)}>{previewTitle}</div>
        <Card.Root fullWidth>
          <Card.Content>
            <div {...stylex.props(styles.muted)}>
              {t`Create a few ${objectMetadataItem.labelPlural} to preview this rule on real records.`}
            </div>
          </Card.Content>
        </Card.Root>
      </>
    );
  }

  const referencedPaths = compilationResult.isValid
    ? [
        ...new Set(
          parseValidationRuleExpression(expression).variables({
            withMembers: true,
          }),
        ),
      ].filter((path) => path !== VALIDATION_RULE_NOW_VARIABLE_NAME)
    : [];

  const evaluationResult = compilationResult.isValid
    ? evaluateValidationRuleExpression({
        expression,
        record,
        fields,
        now: new Date().toISOString(),
      })
    : undefined;

  const trimmedMessage = message.trim();
  const isErrorMessageVisible =
    evaluationResult?.status === 'failed' && isNonEmptyString(trimmedMessage);

  const renderStatus = () => {
    if (!isDefined(evaluationResult)) {
      return null;
    }

    switch (evaluationResult.status) {
      case 'passed':
        return (
          <span {...stylex.props(styles.status)}>
            <Status color="green">{t`Valid`}</Status>
          </span>
        );
      case 'failed':
        return (
          <span {...stylex.props(styles.status)}>
            <Status color="red">{t`Blocked`}</Status>
          </span>
        );
      case 'errored':
        return (
          <Tooltip
            delay={TooltipDelay.mediumDelay}
            content={evaluationResult.errorMessage}
            side="top"
          >
            <span tabIndex={0} {...stylex.props(styles.status)}>
              <Status color="orange">{t`Error`}</Status>
            </span>
          </Tooltip>
        );
    }
  };

  const displayedRecordNumber = records.indexOf(record) + 1;
  const recordCount = records.length;

  return (
    <>
      <div {...stylex.props(styles.previewHeader)}>
        {previewTitle}
        <div {...stylex.props(styles.navigation)}>
          {t`Record ${displayedRecordNumber} of ${recordCount}`}
          <LightIconButton
            aria-label={t`Previous record`}
            disabled={displayedRecordNumber === 1}
            onClick={() => setRecordIndex(displayedRecordNumber - 2)}
          >
            <IconChevronUp />
          </LightIconButton>
          <LightIconButton
            aria-label={t`Next record`}
            disabled={displayedRecordNumber === recordCount}
            onClick={() => setRecordIndex(displayedRecordNumber)}
          >
            <IconChevronDown />
          </LightIconButton>
        </div>
      </div>
      <Card.Root fullWidth>
        <Card.Content>
          <div {...stylex.props(styles.recordHeader)}>
            <div {...stylex.props(styles.record)}>
              <RecordChip
                objectNameSingular={objectMetadataItem.nameSingular}
                record={record}
                forceDisableClick
              />
            </div>
            {renderStatus()}
          </div>
          {referencedPaths.length === 0 ? (
            <div {...stylex.props(styles.fieldValuesPlaceholder)}>
              {compilationResult.isValid
                ? t`This condition doesn't read any field.`
                : t`Fields used in the condition show their values here.`}
            </div>
          ) : (
            <div {...stylex.props(styles.fieldValues)}>
              {referencedPaths.map((path) => {
                const editorField = editorFields.find(
                  (candidate) => candidate.path === path,
                );
                const fieldLabel = isDefined(editorField)
                  ? getValidationRuleEditorFieldChipLabel(editorField)
                  : path;
                const FieldIcon = isDefined(editorField)
                  ? getIcon(editorField.iconName)
                  : undefined;
                const formattedValue = formatValidationRulePreviewValue(
                  getValidationRulePreviewValue(record, path),
                );

                return (
                  <Fragment key={path}>
                    <div {...stylex.props(styles.fieldLabel)}>
                      {isDefined(FieldIcon) && (
                        <FieldIcon
                          {...stylex.props(styles.fieldLabelIcon)}
                          size={theme.icon.size.md}
                          stroke={theme.icon.stroke.sm}
                        />
                      )}
                      {fieldLabel}
                    </div>
                    <span
                      {...stylex.props(
                        styles.value,
                        formattedValue.length === 0 && styles.valueEmpty,
                      )}
                    >
                      {formattedValue.length > 0 ? formattedValue : t`Empty`}
                    </span>
                  </Fragment>
                );
              })}
            </div>
          )}
          {isErrorMessageVisible && (
            <div {...stylex.props(styles.errorMessage)}>
              <InlineBanner status="error" embedded>
                {trimmedMessage}
              </InlineBanner>
            </div>
          )}
        </Card.Content>
      </Card.Root>
    </>
  );
};
