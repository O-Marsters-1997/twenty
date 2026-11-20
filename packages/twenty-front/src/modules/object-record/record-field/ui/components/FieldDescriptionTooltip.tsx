import { FieldDescriptionTooltipContext } from '@/object-record/record-field/ui/contexts/FieldDescriptionTooltipContext';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { isNonEmptyString } from '@sniptt/guards';
import { type ReactNode, useContext, useId } from 'react';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  label: {
    overflow: 'hidden',
    display: 'block',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: '0',
  },
});

type FieldDescriptionTooltipProps = {
  label?: string;
  description?: string | null;
  fallback?: ReactNode;
};

export const FieldDescriptionTooltip = ({
  label,
  description,
  fallback,
}: FieldDescriptionTooltipProps) => {
  const tooltipHandle = useContext(FieldDescriptionTooltipContext);
  const descriptionId = useId();

  if (
    !isDefined(tooltipHandle) ||
    !isNonEmptyString(label) ||
    !isNonEmptyString(description)
  ) {
    return fallback ?? <span {...stylex.props(styles.label)}>{label}</span>;
  }

  return (
    <>
      <Tooltip.Trigger
        handle={tooltipHandle}
        delay={TooltipDelay.longDelay}
        payload={{ title: label, description }}
        render={<span {...stylex.props(styles.label)} />}
        aria-describedby={descriptionId}
        tabIndex={0}
      >
        {label}
      </Tooltip.Trigger>
      <span id={descriptionId} hidden>
        {description}
      </span>
    </>
  );
};
