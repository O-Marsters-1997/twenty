import { isNonEmptyString } from '@sniptt/guards';
import { type FocusEventHandler, useId } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import { type FormFieldInputVariant } from '@/ui/input/types/FormFieldInputVariant';
import { isDefined } from 'twenty-shared/utils';
import { turnIntoEmptyStringIfWhitespacesOnly } from '~/utils/string/turnIntoEmptyStringIfWhitespacesOnly';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  colorTransparent,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export type TextAreaProps = {
  textAreaId: string;
  label?: string;
  disabled?: boolean;
  height?: number;
  minRows?: number;
  maxRows?: number;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
  variant?: FormFieldInputVariant;
};

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  label: {
    color: fontColor['--t-font-color-light'],
    display: 'block',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    marginBottom: spacing['--t-spacing-1'],
  },
  textArea: {
    outline: 'none',
    boxSizing: 'border-box',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
    },
    display: 'block',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    resize: 'none',
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontWeight: fontWeight['--t-font-weight-regular'],
    },
  },
  textAreaDefault: {
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus': color['--t-color-blue'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'auto',
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-2'],
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxShadow: {
      default: null,
      ':focus': `0px 0px 0px 3px ${colorTransparent['--t-color-transparent-blue2']}`,
    },
    lineHeight: '16px',
  },
  textAreaTransparent: {
    borderColor: {
      default: null,
      ':focus': 'transparent',
    },
    borderRadius: 0,
    borderStyle: 'none',
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    lineHeight: 'inherit',
  },
  height: (height: number) => ({ height }),
});

export const TextArea = ({
  textAreaId,
  label,
  disabled,
  height,
  placeholder,
  minRows = 1,
  maxRows,
  value = '',
  className,
  onChange,
  onFocus,
  onBlur,
  readOnly = false,
  variant = 'default',
}: TextAreaProps) => {
  const computedMinRows = isDefined(maxRows)
    ? Math.min(minRows, maxRows)
    : minRows;

  const instanceId = useId();

  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();

  const handleFocus: FocusEventHandler<HTMLTextAreaElement> = () => {
    pushFocusItemToFocusStack({
      focusId: textAreaId,
      component: {
        type: FocusComponentType.TEXT_AREA,
        instanceId: textAreaId,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    });

    onFocus?.();
  };

  const handleBlur: FocusEventHandler<HTMLTextAreaElement> = () => {
    removeFocusItemFromFocusStackById({ focusId: textAreaId });
    onBlur?.();
  };

  const textAreaProps = stylex.props(
    styles.textArea,
    variant === 'transparent'
      ? styles.textAreaTransparent
      : styles.textAreaDefault,
    isDefined(height) && styles.height(height),
  );

  return (
    <div {...stylex.props(styles.container)}>
      {label && (
        <label htmlFor={instanceId} {...stylex.props(styles.label)}>
          {label}
        </label>
      )}

      <div>
        <TextareaAutosize
          id={instanceId}
          placeholder={placeholder}
          maxRows={maxRows}
          minRows={computedMinRows}
          value={value}
          onChange={(event) =>
            onChange?.(turnIntoEmptyStringIfWhitespacesOnly(event.target.value))
          }
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          style={textAreaProps.style}
          className={[textAreaProps.className, className]
            .filter(isNonEmptyString)
            .join(' ')}
        />
      </div>
    </div>
  );
};
