import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { type WorkflowClassifyCriterion } from 'twenty-shared/workflow';
import { IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { v4 } from 'uuid';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  criterion: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexDirection: 'column',
  },
  nameRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'end',
    display: 'flex',
  },
  growingField: {
    flex: '1',
    minWidth: '0',
  },
});

type WorkflowClassifyQuestionCriteriaProps = {
  criteria: WorkflowClassifyCriterion[];
  variant: 'options' | 'levels';
  readonly: boolean;
  maxCriteria?: number;
  onChange: (criteria: WorkflowClassifyCriterion[]) => void;
};

const createEmptyCriterion = (): WorkflowClassifyCriterion => ({
  id: v4(),
  name: '',
  description: '',
});

const hasContent = (criterion: WorkflowClassifyCriterion) =>
  isNonEmptyString(criterion.name.trim()) ||
  isNonEmptyString(criterion.description?.trim());

export const WorkflowClassifyQuestionCriteria = ({
  criteria,
  variant,
  readonly,
  maxCriteria,
  onChange,
}: WorkflowClassifyQuestionCriteriaProps) => {
  const { t } = useLingui();
  const [emptyCriterion, setEmptyCriterion] = useState(createEmptyCriterion);

  const changeCriterion = (
    id: string,
    update: Partial<WorkflowClassifyCriterion>,
  ) => {
    if (id === emptyCriterion.id) {
      const criterion = { ...emptyCriterion, ...update };

      if (hasContent(criterion)) {
        setEmptyCriterion(createEmptyCriterion());
        onChange([...criteria, criterion]);
      }

      return;
    }

    onChange(
      criteria.map((criterion) =>
        criterion.id === id ? { ...criterion, ...update } : criterion,
      ),
    );
  };

  const visibleRows =
    readonly || criteria.length >= (maxCriteria ?? Infinity)
      ? criteria
      : [...criteria, emptyCriterion];

  return (
    <div {...stylex.props(styles.container)}>
      {variant === 'levels' && <InputLabel>{t`Lowest first`}</InputLabel>}
      {visibleRows.map((criterion, index) => (
        <div key={criterion.id} {...stylex.props(styles.criterion)}>
          <div {...stylex.props(styles.nameRow)}>
            <div {...stylex.props(styles.growingField)}>
              <FormTextFieldInput
                label={
                  variant === 'options'
                    ? t`Option ${index + 1} name`
                    : t`Level ${index + 1} name`
                }
                defaultValue={criterion.name}
                placeholder={variant === 'options' ? t`Engineer` : t`Satisfied`}
                readonly={readonly}
                onChange={(name) => changeCriterion(criterion.id, { name })}
              />
            </div>
            {!readonly && (
              <Button
                disabled={criterion.id === emptyCriterion.id}
                startIcon={<IconTrash />}
                aria-label={
                  variant === 'options' ? t`Delete option` : t`Delete level`
                }
                onClick={() =>
                  onChange(criteria.filter((row) => row.id !== criterion.id))
                }
              />
            )}
          </div>
          <FormTextFieldInput
            label={
              variant === 'options' ? t`Description (optional)` : t`Description`
            }
            defaultValue={criterion.description ?? ''}
            placeholder={
              variant === 'options'
                ? t`When should this option be chosen?`
                : t`When should this level apply?`
            }
            readonly={readonly}
            VariablePicker={WorkflowVariablePicker}
            onChange={(description) =>
              changeCriterion(criterion.id, { description })
            }
          />
        </div>
      ))}
    </div>
  );
};
