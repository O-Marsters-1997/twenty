import { TextInput } from '@/ui/input/components/TextInput';
import { type TextInputSize } from '@/ui/input/types/TextInputSize';
import { useRef, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { useRegisterInputEvents } from '@/ui/input/hooks/useRegisterInputEvents';
import { TitleInputAutoOpenEffect } from '@/ui/input/components/TitleInputAutoOpenEffect';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import * as stylex from '@stylexjs/stylex';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type CommonInputProps = {
  instanceId: string;
  value?: string;
  placeholder?: string;
  onEnter?: () => void;
  onEscape?: () => void;
  onClickOutside?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  sizeVariant?: TextInputSize;
};

type InputProps = CommonInputProps & {
  onChange?: (value: string) => void;
};

type TitleInputReadonlyProps = {
  disabled: true;
  onChange?: (value: string) => void;
};

type TitleInputEditableProps = {
  disabled?: false;
  onChange: (value: string) => void;
};

type TitleInputConditionallyReadonlyProps = {
  disabled: boolean;
  onChange: (value: string) => void;
};

type TitleInputEditionProps =
  | TitleInputReadonlyProps
  | TitleInputEditableProps
  | TitleInputConditionallyReadonlyProps;

export type TitleInputProps = CommonInputProps &
  TitleInputEditionProps & {
    shouldFocus?: boolean;
    onFocus?: () => void;
    textColor?: string;
  };

const styles = stylex.create({
  title: {
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'none',
    overflow: 'hidden',
    paddingBlock: spacing['--t-spacing-0'],
    paddingInline: 5,
    alignItems: 'center',
    backgroundColor: 'inherit',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
  },
  clickable: {
    backgroundColor: {
      default: 'inherit',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    cursor: 'pointer',
  },
  xs: { height: 20 },
  sm: { height: 24 },
  md: { height: 28 },
  lg: { height: 32 },
  textColor: (color: string) => ({ color }),
});

const Input = ({
  instanceId,
  value,
  onChange,
  placeholder,
  onEnter,
  onEscape,
  onClickOutside,
  onTab,
  onShiftTab,
  setIsOpened,
  sizeVariant,
}: InputProps & { setIsOpened: (isOpened: boolean) => void }) => {
  const wrapperRef = useRef<HTMLInputElement>(null);

  const [draftValue, setDraftValue] = useState(value ?? '');

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (isDefined(value)) {
      event.target.select();
    }
  };

  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();

  const handleLeaveFocus = () => {
    setIsOpened(false);
    removeFocusItemFromFocusStackById({ focusId: instanceId });
  };

  useRegisterInputEvents<string>({
    focusId: instanceId,
    inputRef: wrapperRef,
    inputValue: draftValue,
    onEnter: () => {
      handleLeaveFocus();
      onEnter?.();
    },
    onEscape: () => {
      handleLeaveFocus();
      onEscape?.();
    },
    onClickOutside: (event) => {
      event.stopImmediatePropagation();
      handleLeaveFocus();
      onClickOutside?.();
    },
    onTab: () => {
      handleLeaveFocus();
      onTab?.();
    },
    onShiftTab: () => {
      handleLeaveFocus();
      onShiftTab?.();
    },
  });

  return (
    <TextInput
      ref={wrapperRef}
      autoGrow
      sizeVariant={sizeVariant}
      inheritFontStyles
      value={draftValue}
      onChange={(text) => {
        setDraftValue(text);
        onChange?.(text);
      }}
      placeholder={placeholder}
      onFocus={handleFocus}
      autoFocus
    />
  );
};

export const TitleInput = ({
  instanceId,
  disabled,
  value,
  sizeVariant = 'md',
  onChange,
  placeholder,
  onEnter,
  onEscape,
  onClickOutside,
  onTab,
  onShiftTab,
  shouldFocus,
  onFocus,
  textColor,
}: TitleInputProps) => {
  const [isOpened, setIsOpened] = useState(false);

  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();

  return (
    <>
      <TitleInputAutoOpenEffect
        shouldFocus={shouldFocus}
        isOpened={isOpened}
        disabled={disabled}
        instanceId={instanceId}
        onFocus={onFocus}
        setIsOpened={setIsOpened}
      />
      {isOpened ? (
        <Input
          instanceId={instanceId}
          sizeVariant={sizeVariant}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onEnter={onEnter}
          onEscape={onEscape}
          onClickOutside={onClickOutside}
          onTab={onTab}
          onShiftTab={onShiftTab}
          setIsOpened={setIsOpened}
        />
      ) : (
        <div
          {...stylex.props(
            styles.title,
            styles[sizeVariant],
            !disabled && styles.clickable,
            isDefined(textColor) && styles.textColor(textColor),
          )}
          onClick={() => {
            if (!disabled) {
              setIsOpened(true);
              pushFocusItemToFocusStack({
                focusId: instanceId,
                component: {
                  type: FocusComponentType.TEXT_INPUT,
                  instanceId: instanceId,
                },
                globalHotkeysConfig: {
                  enableGlobalHotkeysConflictingWithKeyboard: false,
                },
              });
            }
          }}
        >
          <OverflowingTextWithTooltip text={value || placeholder} />
        </div>
      )}
    </>
  );
};
