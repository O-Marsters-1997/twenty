import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import { useRef, type KeyboardEvent, type Ref } from 'react';
import { type MultiItemBaseInputProps } from '@/object-record/record-field/ui/meta-types/input/types/MultiItemBaseInputProps';
import { isKeyboardEventComposing } from '@/ui/utilities/hotkey/utils/isKeyboardEventComposing';
import { useListenClickOutside } from '@/ui/utilities/pointer-event/hooks/useListenClickOutside';
import { Key } from 'ts-key-enum';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { combineRefs } from '~/utils/combineRefs';
import * as stylex from '@stylexjs/stylex';
import {
  color,
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  input: {
    borderStyle: 'none',
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    outlineStyle: 'none',
    position: 'relative',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    height: 32,
    paddingBottom: 0,
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: 0,
    paddingTop: 0,
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontFamily: font['--t-font-family'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  inputWithItem: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  inputWithRightComponent: {
    paddingRight: 32,
  },
  inputContainer: {
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    position: 'relative',
    paddingBottom: {
      default: spacing['--t-spacing-1'],
      ':first-of-type': 0,
    },
    paddingLeft: {
      default: spacing['--t-spacing-1'],
      ':first-of-type': 0,
    },
    paddingRight: {
      default: spacing['--t-spacing-1'],
      ':first-of-type': 0,
    },
    paddingTop: {
      default: spacing['--t-spacing-1'],
      ':first-of-type': 0,
    },
    width: '100%',
  },
  rightContainer: {
    position: 'absolute',
    transform: 'translateY(-50%)',
    right: spacing['--t-spacing-2'],
    top: '50%',
  },
  errorDiv: {
    color: color['--t-color-red'],
    paddingBottom: 0,
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: 0,
  },
});

export const MultiItemBaseInput = ({
  autoFocus,
  className,
  value,
  placeholder,
  onChange,
  onClickOutside,
  onEnter,
  onEscape,
  onShiftTab,
  onTab,
  preventTabNavigation = false,
  onFocus,
  onBlur,
  rightComponent,
  renderInput,
  error = '',
  hasError = false,
  hasItem,
  instanceId,
  ref,
}: MultiItemBaseInputProps & { ref?: Ref<HTMLInputElement> }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const combinedRef = combineRefs(ref, inputRef);

  useListenClickOutside({
    refs: [inputRef],
    callback: () => onClickOutside?.(),
    listenerId: instanceId,
    enabled: isDefined(onClickOutside),
  });

  const getKeyDownHandler = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case Key.Enter:
        return onEnter;
      case Key.Escape:
        return onEscape;
      case Key.Tab:
        return event.shiftKey ? onShiftTab : onTab;
      default:
        return undefined;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const hasUnsupportedModifier =
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.shiftKey && event.key !== Key.Tab);

    if (isKeyboardEventComposing(event.nativeEvent) || hasUnsupportedModifier) {
      return;
    }

    if (event.key === Key.Tab && preventTabNavigation) {
      event.preventDefault();
    }

    const handler = getKeyDownHandler(event);

    if (!isDefined(handler)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handler();
  };

  return (
    <>
      <div {...mergeClassName(stylex.props(styles.inputContainer), className)}>
        {isDefined(renderInput) ? (
          renderInput({
            value,
            onChange,
            autoFocus,
            placeholder,
            hasError,
            onKeyDown: handleKeyDown,
            onFocus,
            onBlur,
          })
        ) : (
          <input
            {...stylex.props(
              styles.input,
              hasItem && styles.inputWithItem,
              isDefined(rightComponent) && styles.inputWithRightComponent,
            )}
            autoFocus={autoFocus}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            ref={combinedRef}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
          />
        )}
        {isDefined(rightComponent) && (
          <div {...stylex.props(styles.rightContainer)}>{rightComponent}</div>
        )}
      </div>
      {isNonEmptyString(error) && (
        <div {...stylex.props(styles.errorDiv)}>{error}</div>
      )}
    </>
  );
};
