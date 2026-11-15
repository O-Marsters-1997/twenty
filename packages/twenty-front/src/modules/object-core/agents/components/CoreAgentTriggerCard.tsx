import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type AgentTrigger } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconClock, IconAddressBook, IconTrash } from 'twenty-ui/icon';
import { Checkbox, type SelectOption } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { type FieldMultiSelectValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { Select } from '@/ui/input/components/Select';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { TextArea } from '@/ui/input/components/TextArea';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { WorkflowFieldsMultiSelect } from '@/workflow/components/WorkflowEditUpdateEventFieldsMultiSelect';
import { useObjectMetadataItemSelectOptions } from '@/object-metadata/hooks/useObjectMetadataItemSelectOptions';
import { describeCronExpression } from '~/utils/cron-to-human/describeCronExpression';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    flex: '1',
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  activeLabel: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-1'],
  },
  row: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  rowItem: {
    flex: '1',
  },
  hint: {
    fontSize: fontSize['--t-font-size-sm'],
  },
  hintDefault: {
    color: fontColor['--t-font-color-tertiary'],
  },
  hintError: {
    color: color['--t-color-red'],
  },
});

const toFieldNames = (fields: FieldMultiSelectValue | string): string[] => {
  if (Array.isArray(fields)) {
    return fields;
  }

  return isDefined(fields) ? [fields] : [];
};

type CoreAgentTriggerCardProps = {
  trigger: AgentTrigger;
  onChange: (trigger: AgentTrigger) => void;
  onDelete: () => void;
  disabled: boolean;
};

export const CoreAgentTriggerCard = ({
  trigger,
  onChange,
  onDelete,
  disabled,
}: CoreAgentTriggerCardProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const { objectMetadataItems } = useFilteredObjectMetadataItems();

  const [objectNameSingular = '', action = 'created'] =
    trigger.type === 'DATABASE_EVENT'
      ? trigger.settings.eventName.split('.')
      : [];

  const objectOptions = useObjectMetadataItemSelectOptions({
    selectedObjectNameSingular: objectNameSingular,
  });

  const actionOptions: SelectOption<string>[] = [
    { label: t`Created`, value: 'created' },
    { label: t`Updated`, value: 'updated' },
    { label: t`Created or updated`, value: 'upserted' },
    { label: t`Deleted`, value: 'deleted' },
    { label: t`Permanently deleted`, value: 'destroyed' },
    { label: t`Restored`, value: 'restored' },
  ];

  const selectedObjectMetadataItem = objectMetadataItems.find(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === objectNameSingular,
  );

  const updateDatabaseEvent = ({
    nextObjectNameSingular = objectNameSingular,
    nextAction = action,
    updatedFields,
  }: {
    nextObjectNameSingular?: string;
    nextAction?: string;
    updatedFields?: string[];
  }) => {
    if (trigger.type !== 'DATABASE_EVENT') {
      return;
    }

    onChange({
      ...trigger,
      settings: {
        ...trigger.settings,
        eventName: `${nextObjectNameSingular}.${nextAction}`,
        updatedFields: nextAction === 'updated' ? updatedFields : undefined,
      },
    });
  };

  const handleWatchedFieldsChange = (
    fields: FieldMultiSelectValue | string,
  ) => {
    const updatedFields = toFieldNames(fields);

    updateDatabaseEvent({
      updatedFields: updatedFields.length > 0 ? updatedFields : undefined,
    });
  };

  const scheduleDescription = (() => {
    if (trigger.type !== 'CRON') {
      return null;
    }

    try {
      return {
        text: describeCronExpression(trigger.settings.pattern, {
          use24HourTimeFormat: true,
        }),
        isError: false,
      };
    } catch {
      return { text: t`This cron pattern is not valid`, isError: true };
    }
  })();

  const title =
    trigger.type === 'CRON' ? t`On a schedule` : t`When a record changes`;

  const TriggerIcon = trigger.type === 'CRON' ? IconClock : IconAddressBook;

  return (
    <div {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.header)}>
        <TriggerIcon size={theme.icon.size.md} />
        <div {...stylex.props(styles.title)}>{title}</div>
        <label {...stylex.props(styles.activeLabel)}>
          <Checkbox
            aria-label={t`Active`}
            checked={trigger.isActive}
            onCheckedChange={(isChecked) =>
              onChange({ ...trigger, isActive: isChecked })
            }
            disabled={disabled}
          />
          {t`Active`}
        </label>
        <LightIconButton
          emphasis="subtle"
          aria-label={t`Remove trigger`}
          onClick={onDelete}
          disabled={disabled}
        >
          <IconTrash />
        </LightIconButton>
      </div>
      {trigger.type === 'DATABASE_EVENT' && (
        <>
          <div {...stylex.props(styles.row)}>
            <div {...stylex.props(styles.rowItem)}>
              <Select
                dropdownId={`agent-trigger-object-${trigger.id}`}
                label={t`Record type`}
                fullWidth
                disabled={disabled}
                value={objectNameSingular}
                options={objectOptions}
                onChange={(value) =>
                  updateDatabaseEvent({ nextObjectNameSingular: value })
                }
                withSearchInput
                dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
              />
            </div>
            <div {...stylex.props(styles.rowItem)}>
              <Select
                dropdownId={`agent-trigger-action-${trigger.id}`}
                label={t`Event`}
                fullWidth
                disabled={disabled}
                value={action}
                options={actionOptions}
                onChange={(value) => updateDatabaseEvent({ nextAction: value })}
              />
            </div>
          </div>
          {action === 'updated' && isDefined(selectedObjectMetadataItem) && (
            <WorkflowFieldsMultiSelect
              key={objectNameSingular}
              label={t`Fields (optional)`}
              placeholder={t`Only run when one of these fields changes`}
              objectMetadataItem={selectedObjectMetadataItem}
              handleFieldsChange={handleWatchedFieldsChange}
              readonly={disabled}
              defaultFields={trigger.settings.updatedFields}
              actionType="DATABASE_EVENT"
            />
          )}
        </>
      )}
      {trigger.type === 'CRON' && (
        <div>
          <SettingsTextInput
            instanceId={`agent-trigger-cron-${trigger.id}`}
            label={t`Cron pattern`}
            placeholder="0 9 * * 1"
            value={trigger.settings.pattern}
            onChange={(pattern) =>
              onChange({ ...trigger, settings: { pattern } })
            }
            disabled={disabled}
            fullWidth
          />
          {isDefined(scheduleDescription) && (
            <div
              {...stylex.props(
                styles.hint,
                scheduleDescription.isError
                  ? styles.hintError
                  : styles.hintDefault,
              )}
            >
              {scheduleDescription.text}
            </div>
          )}
        </div>
      )}
      <TextArea
        textAreaId={`agent-trigger-instructions-${trigger.id}`}
        label={t`Instructions`}
        placeholder={t`What should the agent do when this trigger fires?`}
        minRows={2}
        maxRows={8}
        value={trigger.instructions ?? ''}
        onChange={(instructions) =>
          onChange({
            ...trigger,
            instructions: isNonEmptyString(instructions.trim())
              ? instructions
              : null,
          })
        }
        disabled={disabled}
      />
    </div>
  );
};
