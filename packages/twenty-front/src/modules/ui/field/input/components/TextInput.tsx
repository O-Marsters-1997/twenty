import * as stylex from '@stylexjs/stylex';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from 'react';

import { LightCopyIconButton } from '@/ui/input/components/LightCopyIconButton';
import { useRegisterInputEvents } from '@/ui/input/hooks/useRegisterInputEvents';
import {
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  input: {
    backgroundColor: 'transparent',
    borderWidth: '0',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
    },
    fontFamily: font['--t-font-family'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
    outlineStyle: 'none',
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: spacing['--t-spacing-2'],
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontFamily: font['--t-font-family'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
});

type StyledTextInputProps = ComponentProps<'input'> & {
  xstyle?: stylex.StyleXStyles;
};

export const StyledTextInput = ({ xstyle, ...props }: StyledTextInputProps) => (
  <input {...props} {...stylex.props(styles.input, xstyle)} />
);

export type TextInputProps = {
  instanceId: string;
  placeholder?: string;
  autoFocus?: boolean;
  selectOnFocus?: boolean;
  value: string;
  onEnter?: (newText: string) => void;
  onEscape?: (newText: string) => void;
  onTab?: (newText: string) => void;
  onShiftTab?: (newText: string) => void;
  onClickOutside?: (event: MouseEvent | TouchEvent, inputValue: string) => void;
  onChange?: (newText: string) => void;
  copyButton?: boolean;
  shouldTrim?: boolean;
  disabled?: boolean;
};

const getValue = (value: string, shouldTrim: boolean) => {
  if (shouldTrim) {
    return value.trim();
  }

  return value;
};

export const TextInput = ({
  instanceId,
  placeholder,
  autoFocus,
  selectOnFocus = false,
  value,
  onEnter,
  onEscape,
  onTab,
  onShiftTab,
  onClickOutside,
  onChange,
  copyButton = true,
  shouldTrim = true,
  disabled,
}: TextInputProps) => {
  const [internalText, setInternalText] = useState(value);

  const wrapperRef = useRef<HTMLInputElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInternalText(getValue(event.target.value, shouldTrim));
    onChange?.(getValue(event.target.value, shouldTrim));
  };
  useEffect(() => {
    setInternalText(getValue(value, shouldTrim));
  }, [value, shouldTrim]);

  useRegisterInputEvents({
    focusId: instanceId,
    inputRef: wrapperRef,
    copyRef: copyRef,
    inputValue: internalText,
    onEnter,
    onEscape,
    onClickOutside,
    onTab,
    onShiftTab,
  });

  return (
    <>
      <StyledTextInput
        id={instanceId}
        autoComplete="off"
        ref={wrapperRef}
        placeholder={placeholder}
        onChange={handleChange}
        autoFocus={autoFocus}
        onFocus={
          selectOnFocus ? (event) => event.currentTarget.select() : undefined
        }
        value={internalText}
        disabled={disabled}
      />
      {copyButton && (
        <div ref={copyRef}>
          <LightCopyIconButton copyText={internalText} />
        </div>
      )}
    </>
  );
};
