import { useLingui } from '@lingui/react/macro';
import {
  AGENT_TRIGGER_LIMITS,
  type AgentTrigger,
} from 'twenty-shared/application';
import { Section } from 'twenty-ui/components/layout';
import { IconClock, IconAddressBook } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';

import { CoreAgentTriggerCard } from '@/object-core/agents/components/CoreAgentTriggerCard';
import { buildDefaultCoreAgentTrigger } from '@/object-core/agents/utils/buildDefaultCoreAgentTrigger';
import { useObjectMetadataItemSelectOptions } from '@/object-metadata/hooks/useObjectMetadataItemSelectOptions';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  triggerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
  },
  actions: {
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    marginTop: spacing['--t-spacing-3'],
  },
  emptyMessage: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

type CoreAgentTriggersTabProps = {
  triggers: AgentTrigger[];
  onTriggersChange: (triggers: AgentTrigger[]) => void;
  disabled: boolean;
};

export const CoreAgentTriggersTab = ({
  triggers,
  onTriggersChange,
  disabled,
}: CoreAgentTriggersTabProps) => {
  const { t } = useLingui();
  const objectOptions = useObjectMetadataItemSelectOptions();

  const defaultObjectNameSingular =
    objectOptions.find((option) => option.value === 'company')?.value ??
    objectOptions[0]?.value ??
    'company';

  const canAddTrigger =
    !disabled && triggers.length < AGENT_TRIGGER_LIMITS.MAX_TRIGGERS_PER_AGENT;

  const addTrigger = (type: AgentTrigger['type']) =>
    onTriggersChange([
      ...triggers,
      buildDefaultCoreAgentTrigger({
        type,
        objectNameSingular: defaultObjectNameSingular,
      }),
    ]);

  const updateTrigger = (updatedTrigger: AgentTrigger) =>
    onTriggersChange(
      triggers.map((trigger) =>
        trigger.id === updatedTrigger.id ? updatedTrigger : trigger,
      ),
    );

  const deleteTrigger = (triggerId: string) =>
    onTriggersChange(triggers.filter((trigger) => trigger.id !== triggerId));

  return (
    <Section.Root>
      <Section.Header
        title={t`Triggers`}
        description={t`Run this agent on its own when records change or on a schedule. It runs with its role's permissions.`}
      />
      <div {...stylex.props(styles.triggerList)}>
        {triggers.length === 0 && (
          <div {...stylex.props(styles.emptyMessage)}>
            {t`This agent only runs when someone sends it a message.`}
          </div>
        )}
        {triggers.map((trigger) => (
          <CoreAgentTriggerCard
            key={trigger.id}
            trigger={trigger}
            onChange={updateTrigger}
            onDelete={() => deleteTrigger(trigger.id)}
            disabled={disabled}
          />
        ))}
      </div>
      {canAddTrigger && (
        <div {...stylex.props(styles.actions)}>
          <Button
            startIcon={<IconAddressBook />}
            size="sm"
            variant="outline"
            onClick={() => addTrigger('DATABASE_EVENT')}
          >{t`Add record trigger`}</Button>
          <Button
            startIcon={<IconClock />}
            size="sm"
            variant="outline"
            onClick={() => addTrigger('CRON')}
          >{t`Add schedule`}</Button>
        </div>
      )}
    </Section.Root>
  );
};
