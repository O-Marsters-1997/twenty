import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { FormFieldInputInnerContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputInnerContainer';
import { FormFieldInputRowContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputRowContainer';
import { Field, Switch } from 'twenty-ui/primitives/input';
import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type FormBooleanFieldSwitchInputProps = {
  label?: string;
  description: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

const styles = stylex.create({
  description: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    overflow: 'hidden',
    paddingLeft: spacing['--t-spacing-2'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  switchContainer: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: borderColor['--t-border-color-medium'],
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: borderColor['--t-border-color-medium'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    paddingBottom: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

export const FormBooleanFieldSwitchInput = ({
  label,
  description,
  hint,
  value,
  onChange,
  disabled,
}: FormBooleanFieldSwitchInputProps) => {
  const instanceId = useId();
  const descriptionId = `${instanceId}-description`;

  return (
    <FormFieldInputContainer>
      {label ? <Field.Label>{label}</Field.Label> : null}

      <FormFieldInputRowContainer>
        <FormFieldInputInnerContainer
          formFieldInputInstanceId={instanceId}
          hasRightElement
          preventFocusStackUpdate
        >
          <span id={descriptionId} {...stylex.props(styles.description)}>
            {description}
          </span>
        </FormFieldInputInnerContainer>

        <div {...stylex.props(styles.switchContainer)}>
          <Switch
            aria-labelledby={descriptionId}
            checked={value}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={disabled}
            size="sm"
          />
        </div>
      </FormFieldInputRowContainer>

      {hint && <Field.Description>{hint}</Field.Description>}
    </FormFieldInputContainer>
  );
};
