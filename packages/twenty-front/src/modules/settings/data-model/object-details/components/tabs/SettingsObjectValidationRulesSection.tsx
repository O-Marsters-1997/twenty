import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components/feedback';
import { IconChevronRight, IconPlus, useIcons } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { Status } from 'twenty-ui/primitives/data-display';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { VALIDATION_RULE_DEFAULT_ICON } from '@/validation-rules/constants/ValidationRuleDefaultIcon';
import { useValidationRuleMutations } from '@/validation-rules/hooks/useValidationRuleMutations';
import { useValidationRules } from '@/validation-rules/hooks/useValidationRules';
import { getValidationRuleSaveErrorMessage } from '@/validation-rules/utils/getValidationRuleSaveErrorMessage';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const VALIDATION_RULE_TABLE_GRID_TEMPLATE_COLUMNS = '1fr 1fr 28px';

const styles = stylex.create({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
  tableContainer: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
  },
  nameCell: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    minWidth: '0',
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  iconChevronRightContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
  empty: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-md'],
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: spacing['--t-spacing-2'],
  },
});

type SettingsObjectValidationRulesSectionProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  isReadOnly: boolean;
};

export const SettingsObjectValidationRulesSection = ({
  objectMetadataItem,
  isReadOnly,
}: SettingsObjectValidationRulesSectionProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const { getIcon } = useIcons();
  const { validationRules } = useValidationRules({
    objectMetadataId: objectMetadataItem.id,
  });

  const objectNamePlural = objectMetadataItem.namePlural;
  const navigateSettings = useNavigateSettings();
  const { enqueueToast } = useToast();
  const { createValidationRule, isSaving } = useValidationRuleMutations({
    objectMetadataId: objectMetadataItem.id,
  });

  const handleAddRule = async () => {
    try {
      const { data } = await createValidationRule({
        variables: {
          input: {
            objectMetadataId: objectMetadataItem.id,
            name: t`New rule`,
            expression: '',
            message: '',
            isActive: false,
          },
        },
      });
      const validationRuleId = data?.createValidationRule.id;

      if (isDefined(validationRuleId)) {
        navigateSettings(SettingsPath.ObjectValidationRuleEdit, {
          objectNamePlural,
          validationRuleId,
        });
      }
    } catch (error) {
      enqueueToast({
        status: 'error',
        children:
          getValidationRuleSaveErrorMessage(error) ??
          t`Failed to create the rule.`,
      });
    }
  };

  return (
    <div {...stylex.props(styles.content)}>
      <div {...stylex.props(styles.tableContainer)}>
        <Table>
          <TableRow
            gridTemplateColumns={VALIDATION_RULE_TABLE_GRID_TEMPLATE_COLUMNS}
          >
            <TableHeader>{t`Name`}</TableHeader>
            <TableHeader>{t`Status`}</TableHeader>
            <TableHeader />
          </TableRow>
          <TableBody>
            {validationRules.length === 0 ? (
              <div {...stylex.props(styles.empty)}>{t`No rules yet`}</div>
            ) : (
              validationRules.map((validationRule) => {
                const RuleIcon = getIcon(
                  validationRule.icon ?? VALIDATION_RULE_DEFAULT_ICON,
                );

                return (
                  <TableRow
                    key={validationRule.id}
                    gridTemplateColumns={
                      VALIDATION_RULE_TABLE_GRID_TEMPLATE_COLUMNS
                    }
                    to={getSettingsPath(SettingsPath.ObjectValidationRuleEdit, {
                      objectNamePlural,
                      validationRuleId: validationRule.id,
                    })}
                  >
                    <TableCell
                      color={themeCssVariables.font.color.primary}
                      minWidth="0"
                      overflow="hidden"
                    >
                      <span {...stylex.props(styles.nameCell)}>
                        <RuleIcon size={theme.icon.size.md} />
                        <span {...stylex.props(styles.name)}>
                          {validationRule.name}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {validationRule.isActive ? (
                        <Status color="green">{t`Active`}</Status>
                      ) : (
                        <Status color="gray">{t`Inactive`}</Status>
                      )}
                    </TableCell>
                    <TableCell
                      align="center"
                      padding={`0 ${themeCssVariables.spacing[1]} 0 0`}
                    >
                      <span {...stylex.props(styles.iconChevronRightContainer)}>
                        <IconChevronRight
                          size={theme.icon.size.md}
                          stroke={theme.icon.stroke.sm}
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {!isReadOnly && (
        <div {...stylex.props(styles.buttonContainer)}>
          <Button
            startIcon={<IconPlus />}
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={handleAddRule}
          >{t`Add rule`}</Button>
        </div>
      )}
    </div>
  );
};
