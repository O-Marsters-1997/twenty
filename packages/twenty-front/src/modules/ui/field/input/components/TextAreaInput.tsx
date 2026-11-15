import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import { LightCopyIconButton } from '@/ui/input/components/LightCopyIconButton';
import { useRegisterInputEvents } from '@/ui/input/hooks/useRegisterInputEvents';
import { isDefined } from 'twenty-shared/utils';
import { turnIntoEmptyStringIfWhitespacesOnly } from '~/utils/string/turnIntoEmptyStringIfWhitespacesOnly';
import * as stylex from '@stylexjs/stylex';
import {
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export type TextAreaInputProps = {
  instanceId: string;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  value: string;
  onEnter: (newText: string) => void;
  onEscape: (newText: string) => void;
  onTab?: (newText: string) => void;
  onShiftTab?: (newText: string) => void;
  onClickOutside: (event: MouseEvent | TouchEvent, inputValue: string) => void;
  onChange?: (newText: string) => void;
  maxRows?: number;
  copyButton?: boolean;
};

const styles = stylex.create({
  container: {
    width: '100%',
  },
  textarea: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: '0',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    justifyContent: 'center',
    lineHeight: '18px',
    maxHeight: '400px',
    outlineStyle: 'none',
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: spacing['--t-spacing-2'],
    resize: 'none',
    width: `calc(100% - ${spacing['--t-spacing-7']})`,
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontFamily: font['--t-font-family'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  lightIconButtonContainer: {
    backgroundColor: 'transparent',
    position: 'absolute',
    right: '0',
    top: '16px',
    transform: 'translateY(-50%)',
  },
});

export const TextAreaInput = ({
  instanceId,
  disabled,
  placeholder,
  autoFocus,
  value,
  onEnter,
  onEscape,
  onTab,
  onShiftTab,
  onClickOutside,
  onChange,
  maxRows,
  copyButton = true,
}: TextAreaInputProps) => {
  const [internalText, setInternalText] = useState(value);
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const targetValue = turnIntoEmptyStringIfWhitespacesOnly(
      event.target.value,
    );
    setInternalText(targetValue);
    onChange?.(targetValue);
  };

  const wrapperRef = useRef<HTMLTextAreaElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDefined(wrapperRef.current)) {
      wrapperRef.current.setSelectionRange(
        wrapperRef.current.value.length,
        wrapperRef.current.value.length,
      );
    }
  }, []);

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
      <div {...stylex.props(styles.container)}>
        <TextareaAutosize
          placeholder={placeholder}
          disabled={disabled}
          ref={wrapperRef}
          onChange={handleChange}
          autoFocus={autoFocus}
          value={internalText}
          maxRows={maxRows}
          {...stylex.props(styles.textarea)}
        />
      </div>
      {copyButton && (
        <div ref={copyRef} {...stylex.props(styles.lightIconButtonContainer)}>
          <LightCopyIconButton copyText={internalText} />
        </div>
      )}
    </>
  );
};
