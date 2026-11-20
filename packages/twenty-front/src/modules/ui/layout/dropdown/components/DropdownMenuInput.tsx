import {
  forwardRef,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import 'react-phone-number-input/style.css';

import { useRegisterInputEvents } from '@/ui/input/hooks/useRegisterInputEvents';
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
    paddingBlock: spacing['--t-spacing-0'],
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    fontFamily: font['--t-font-family'],
    fontSize: 'inherit',
    fontWeight: 'inherit',
    outlineStyle: 'none',
    position: 'relative',
    height: '32px',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: 0,
    width: '100%',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontFamily: font['--t-font-family'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  inputWithRightComponent: {
    paddingRight: '32px',
  },
  inputContainer: {
    padding: {
      default: null,
      ':not(:first-of-type)': spacing['--t-spacing-1'],
    },
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    position: 'relative',
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
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: '0',
  },
});

type HTMLInputProps = InputHTMLAttributes<HTMLInputElement>;

export type DropdownMenuInputProps = HTMLInputProps & {
  instanceId: string;
  onClickOutside?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onShiftTab?: () => void;
  onTab?: () => void;
  rightComponent?: ReactNode;
  renderInput?: (props: {
    value: HTMLInputProps['value'];
    onChange: HTMLInputProps['onChange'];
    autoFocus: HTMLInputProps['autoFocus'];
    placeholder: HTMLInputProps['placeholder'];
  }) => React.ReactNode;
  error?: string | null;
};

export const DropdownMenuInput = forwardRef<
  HTMLInputElement,
  DropdownMenuInputProps
>(
  (
    {
      autoFocus,
      className,
      value,
      placeholder,
      instanceId,
      onChange,
      onClickOutside,
      onEnter = () => {},
      onEscape = () => {},
      onShiftTab,
      onTab,
      rightComponent,
      renderInput,
      error = '',
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = combineRefs(ref, inputRef);

    useRegisterInputEvents({
      focusId: instanceId,
      inputRef,
      inputValue: value,
      onEnter,
      onEscape,
      onClickOutside,
      onTab,
      onShiftTab,
    });

    const containerProps = stylex.props(styles.inputContainer);

    return (
      <>
        <div
          {...containerProps}
          className={[containerProps.className, className].join(' ')}
        >
          {renderInput ? (
            renderInput({
              value,
              onChange,
              autoFocus,
              placeholder,
            })
          ) : (
            <input
              autoFocus={autoFocus}
              value={value}
              placeholder={placeholder}
              onChange={onChange}
              ref={combinedRef}
              {...stylex.props(
                styles.input,
                isDefined(rightComponent) && styles.inputWithRightComponent,
              )}
            />
          )}
          {isDefined(rightComponent) && (
            <div {...stylex.props(styles.rightContainer)}>{rightComponent}</div>
          )}
        </div>
        {error && <div {...stylex.props(styles.errorDiv)}>{error}</div>}
      </>
    );
  },
);
