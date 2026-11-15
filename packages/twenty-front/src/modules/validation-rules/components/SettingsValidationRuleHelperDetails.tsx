import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { useIcons } from 'twenty-ui/icon';
import { Tag } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';

import { getSettingsFieldTypeConfig } from '@/settings/data-model/utils/getSettingsFieldTypeConfig';
import { isFieldTypeSupportedInSettings } from '@/settings/data-model/utils/isFieldTypeSupportedInSettings';
import { SettingsValidationRuleExampleExpression } from '@/validation-rules/components/SettingsValidationRuleExampleExpression';
import { type ValidationRuleEditorField } from '@/validation-rules/types/ValidationRuleEditorField';
import { type ValidationRuleHelperItem } from '@/validation-rules/types/ValidationRuleHelperItem';
import { computeValidationRuleHelperItemExamples } from '@/validation-rules/utils/computeValidationRuleHelperItemExamples';
import { getValidationRuleEditorFieldChipLabel } from '@/validation-rules/utils/getValidationRuleEditorFieldChipLabel';
import { getValidationRuleHelperItemIcon } from '@/validation-rules/utils/getValidationRuleHelperItemIcon';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderColor, borderRadius, codeFont, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    minWidth: '0',
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    marginBottom: spacing['--t-spacing-1'],
  },
  titleRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
  },
  title: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
  },
  signature: {
    fontFamily: codeFont['--t-code-font-family'],
  },
  subtitle: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
    lineHeight: '1.5',
  },
  example: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    lineHeight: '24px',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

type SettingsValidationRuleHelperDetailsProps = {
  item: ValidationRuleHelperItem;
  editorFields: ValidationRuleEditorField[];
};

export const SettingsValidationRuleHelperDetails = ({
  item,
  editorFields,
}: SettingsValidationRuleHelperDetailsProps) => {
  const { t, i18n } = useLingui();
  const theme = useTheme();
  const { getIcon } = useIcons();

  const ItemIcon = getValidationRuleHelperItemIcon({ item, getIcon });

  const examples = computeValidationRuleHelperItemExamples({
    item,
    fields: editorFields,
  });

  const itemIcon = (
    <ItemIcon
      size={theme.icon.size.md}
      stroke={theme.icon.stroke.sm}
      color={theme.font.color.tertiary}
    />
  );

  const renderHeader = () => {
    switch (item.kind) {
      case 'field': {
        const typeLabel = isFieldTypeSupportedInSettings(item.field.type)
          ? i18n._(getSettingsFieldTypeConfig(item.field.type).label)
          : item.field.type;
        const ObjectIcon = getIcon(item.field.objectIconName);

        return (
          <>
            <div {...stylex.props(styles.titleRow)}>
              <div {...stylex.props(styles.title)}>
                {itemIcon}
                {getValidationRuleEditorFieldChipLabel(item.field)}
              </div>
              <Tag
                color="blue"
                startIcon={<ObjectIcon size={theme.icon.size.sm} />}
              >
                {item.field.objectLabelSingular}
              </Tag>
            </div>
            <div {...stylex.props(styles.subtitle)}>{t`${typeLabel} field`}</div>
          </>
        );
      }
      case 'function':
      case 'keyword':
        return (
          <>
            <div {...stylex.props(styles.title)}>
              {itemIcon}
              <span {...stylex.props(styles.signature)}>{item.definition.signature}</span>
            </div>
            <div {...stylex.props(styles.subtitle)}>
              {item.kind === 'function' ? t`Function` : t`Keyword`}
            </div>
          </>
        );
    }
  };

  const getDescription = () => {
    if (item.kind !== 'field') {
      return t(item.definition.description);
    }

    return item.field.readsRelatedRecord
      ? t`Checked only when the record this rule belongs to is saved. Editing the related record does not check it again.`
      : undefined;
  };

  const description = getDescription();

  return (
    <div {...stylex.props(styles.details)}>
      <div {...stylex.props(styles.header)}>{renderHeader()}</div>
      {isDefined(description) && (
        <div {...stylex.props(styles.description)}>{description}</div>
      )}
      {examples.map((example) => (
        <div key={example} {...stylex.props(styles.example)}>
          <SettingsValidationRuleExampleExpression
            expression={example}
            editorFields={editorFields}
          />
        </div>
      ))}
    </div>
  );
};
