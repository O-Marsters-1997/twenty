import { mergeProps } from '@base-ui/react/merge-props';
import { type TextInputComponentProps } from '@/ui/input/types/TextInputComponentProps';
import { type TextInputSize } from '@/ui/input/types/TextInputSize';
import { AutogrowWrapper } from '@/ui/input/components/internal/AutogrowWrapper/AutogrowWrapper';
import { isNonEmptyString } from '@sniptt/guards';
import React, {
  type ChangeEvent,
  type FocusEventHandler,
  forwardRef,
  useId,
  useRef,
  useState,
} from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconEye, IconEyeOff } from 'twenty-ui/icon';
import { Field } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import { combineRefs } from '~/utils/combineRefs';
import { turnIntoEmptyStringIfWhitespacesOnly } from '~/utils/string/turnIntoEmptyStringIfWhitespacesOnly';
import { PASSWORD_MANAGER_IGNORE_ATTRIBUTES } from '@/ui/input/constants/PasswordManagerIgnoreAttributes';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const INPUT_TYPE_PASSWORD = 'password';

type TextInputWithAutoGrowWrapperProps = TextInputComponentProps;

const TextInputComponent = forwardRef<
  HTMLInputElement,
  TextInputComponentProps
>(
  (
    {
      'aria-label': ariaLabel,
      className,
      label,
      value,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      fullWidth,
      width,
      error,
      noErrorHelper = false,
      required,
      type,
      autoFocus,
      placeholder,
      disabled,
      readOnly,
      tabIndex,
      RightIcon,
      onRightIconClick,
      LeftIcon,
      autoComplete,
      maxLength,
      sizeVariant = 'lg',
      inheritFontStyles = false,
      dataTestId,
      autoGrow = false,
      rightAdornment,
      leftAdornment,
      textClickOutsideId,
      ignorePasswordManagers = false,
      inputProps,
    },
    ref,
  ) => {
    const theme = useTheme();
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = combineRefs(ref, inputRef, inputProps?.ref);

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handleTogglePasswordVisibility = () => {
      setPasswordVisible(!passwordVisible);
    };

    const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
      setIsFocused(true);
      onFocus?.(event);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
      setIsFocused(false);
      onBlur?.(event);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(turnIntoEmptyStringIfWhitespacesOnly(event.target.value));
    };

    const mergedInputProps = mergeProps<'input'>(inputProps, {
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown,
      onChange: handleChange,
    });

    const generatedId = useId();
    const instanceId = inputProps?.id ?? generatedId;

    const { className: containerClassName } = stylex.props(
      styles.container,
      fullWidth === true && styles.containerFullWidth,
    );

    return (
      <Field.Root {...stylex.props(styles.fieldRootClassName)}>
        <div
          className={[containerClassName, className]
            .filter(isNonEmptyString)
            .join(' ')}
          data-click-outside-id={textClickOutsideId}
        >
          {label && (
            <Field.Label htmlFor={instanceId}>
              {label + (required ? '*' : '')}
            </Field.Label>
          )}
          <div {...stylex.props(styles.inputContainer)}>
            {leftAdornment && (
              <div
                {...stylex.props(
                  styles.adornment,
                  styles.adornmentLeft,
                  ADORNMENT_SIZE_STYLES[sizeVariant],
                )}
              >
                {leftAdornment}
              </div>
            )}

            {!!LeftIcon && (
              <div
                {...stylex.props(
                  styles.leftIconContainer,
                  LEFT_ICON_SIZE_STYLES[sizeVariant],
                )}
              >
                <div
                  {...stylex.props(
                    styles.trailingIcon,
                    isFocused && styles.trailingIconFocused,
                  )}
                >
                  <LeftIcon size={theme.icon.size.md} />
                </div>
              </div>
            )}

            <input
              aria-label={ariaLabel}
              id={instanceId}
              data-testid={dataTestId}
              autoComplete={autoComplete ?? 'off'}
              // oxlint-disable-next-line react/jsx-props-no-spreading
              {...(ignorePasswordManagers &&
                PASSWORD_MANAGER_IGNORE_ATTRIBUTES)}
              tabIndex={tabIndex ?? 0}
              type={passwordVisible ? 'text' : type}
              autoFocus={autoFocus}
              disabled={disabled}
              readOnly={readOnly}
              placeholder={placeholder}
              required={required}
              value={value}
              maxLength={maxLength}
              // oxlint-disable-next-line react/jsx-props-no-spreading
              {...mergedInputProps}
              ref={combinedRef}
              {...stylex.props(
                styles.input,
                INPUT_SIZE_STYLES[sizeVariant],
                !inheritFontStyles && styles.inputOwnFont,
                inheritFontStyles && styles.inputInheritedFont,
                autoGrow && styles.inputAutoGrow,
                !autoGrow && !!LeftIcon && styles.inputWithLeftIcon,
                !autoGrow && !!RightIcon && styles.inputWithRightIcon,
                !!rightAdornment && styles.inputBeforeAdornment,
                !!leftAdornment && styles.inputAfterAdornment,
                !!error && styles.inputError,
                isDefined(width) && styles.inputWidth(width),
              )}
            />
            {rightAdornment && (
              <div
                {...stylex.props(
                  styles.adornment,
                  styles.adornmentRight,
                  ADORNMENT_SIZE_STYLES[sizeVariant],
                )}
              >
                {rightAdornment}
              </div>
            )}
            <div {...stylex.props(styles.trailingIconContainer)}>
              {!error && type === INPUT_TYPE_PASSWORD && (
                <div
                  onClick={handleTogglePasswordVisibility}
                  data-testid="reveal-password-button"
                  {...stylex.props(
                    styles.trailingIcon,
                    styles.trailingIconClickable,
                    isFocused && styles.trailingIconFocused,
                  )}
                >
                  {passwordVisible ? (
                    <IconEyeOff size={theme.icon.size.md} />
                  ) : (
                    <IconEye size={theme.icon.size.md} />
                  )}
                </div>
              )}
              {!error && type !== INPUT_TYPE_PASSWORD && !!RightIcon && (
                <div
                  onClick={onRightIconClick ? onRightIconClick : undefined}
                  {...stylex.props(
                    styles.trailingIcon,
                    onRightIconClick && styles.trailingIconClickable,
                    isFocused && styles.trailingIconFocused,
                  )}
                >
                  <RightIcon size={theme.icon.size.md} />
                </div>
              )}
            </div>
          </div>
          {!noErrorHelper && error && (
            <div aria-live="polite" {...stylex.props(styles.errorHelper)}>
              <Field.Error match>{error}</Field.Error>
            </div>
          )}
        </div>
      </Field.Root>
    );
  },
);

type StyledAutogrowWrapperProps = React.ComponentProps<
  typeof AutogrowWrapper
> & {
  sizeVariant?: TextInputSize;
};

const StyledAutogrowWrapper = ({
  sizeVariant = 'lg',
  children,
  node,
}: StyledAutogrowWrapperProps) => (
  <AutogrowWrapper
    children={children}
    node={node}
    xstyle={AUTOGROW_SIZE_STYLES[sizeVariant]}
  />
);

const TextInputWithAutoGrowWrapper = forwardRef<
  HTMLInputElement,
  TextInputWithAutoGrowWrapperProps
>((props, ref) => {
  return (
    <>
      {props.autoGrow ? (
        <StyledAutogrowWrapper
          sizeVariant={props.sizeVariant}
          node={isNonEmptyString(props.value) ? props.value : props.placeholder}
        >
          <TextInputComponent
            // oxlint-disable-next-line react/jsx-props-no-spreading
            {...props}
            ref={ref}
            fullWidth={true}
          />
        </StyledAutogrowWrapper>
      ) : (
        <TextInputComponent
          // oxlint-disable-next-line react/jsx-props-no-spreading
          {...props}
          ref={ref}
        />
      )}
    </>
  );
});

export const TextInput = TextInputWithAutoGrowWrapper;

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'inline-flex',
    flexDirection: 'column',
    position: 'relative',
    width: 'auto',
  },
  containerFullWidth: {
    width: '100%',
  },
  errorHelper: {
    position: 'absolute',
  },
  fieldRootClassName: {
    display: 'contents',
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: 'inherit',
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
  },
  adornment: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    minWidth: 'fit-content',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    width: 'auto',
  },
  adornmentLeft: {
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderRightStyle: 'none',
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
  },
  adornmentRight: {
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderLeftStyle: 'none',
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
  },
  adornmentXs: { lineHeight: '20px', height: 20 },
  adornmentSm: { lineHeight: '24px', height: 24 },
  adornmentMd: { lineHeight: '28px', height: 28 },
  adornmentLg: { lineHeight: '32px', height: 32 },
  input: {
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus': color['--t-color-blue'],
    },
    borderStyle: 'solid',
    outline: 'none',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
    },
    display: 'flex',
    flexGrow: 1,
    pointerEvents: {
      default: null,
      ':is([readonly])': 'none',
    },
    textOverflow: 'ellipsis',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderTopWidth: 1,
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    width: '100%',
    '::-webkit-inner-spin-button': {
      appearance: 'none',
      marginBlock: 0,
      marginInline: 0,
    },
    '::-webkit-outer-spin-button': {
      appearance: 'none',
      marginBlock: 0,
      marginInline: 0,
    },
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontFamily: font['--t-font-family'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  inputOwnFont: {
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  inputInheritedFont: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
  },
  inputXs: { height: 20 },
  inputSm: { height: 24 },
  inputMd: { height: 28 },
  inputLg: { height: 32 },
  inputAutoGrow: {
    maxWidth: '100%',
    paddingBottom: 0,
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: 0,
  },
  inputWithLeftIcon: {
    paddingLeft: `calc(${spacing['--t-spacing-3']} + 16px)`,
  },
  inputWithRightIcon: {
    paddingRight: `calc(${spacing['--t-spacing-3']} + 16px)`,
  },
  inputBeforeAdornment: {
    borderBottomRightRadius: 0,
    borderTopRightRadius: 0,
  },
  inputAfterAdornment: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: 0,
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
  },
  inputError: {
    borderColor: borderColor['--t-border-color-danger'],
  },
  inputWidth: (width: string | number) => ({
    width: `calc(${width}px + ${spacing['--t-spacing-0_5']})`,
  }),
  leftIconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    marginBottom: 'auto',
    marginTop: 'auto',
    top: 0,
  },
  leftIconXs: { paddingLeft: spacing['--t-spacing-0_5'] },
  leftIconSm: { paddingLeft: spacing['--t-spacing-1'] },
  leftIconMd: { paddingLeft: spacing['--t-spacing-1'] },
  leftIconLg: { paddingLeft: spacing['--t-spacing-2'] },
  trailingIcon: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    cursor: 'default',
    display: 'flex',
    justifyContent: 'center',
  },
  trailingIconFocused: {
    color: fontColor['--t-font-color-secondary'],
  },
  trailingIconClickable: {
    cursor: 'pointer',
  },
  trailingIconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    bottom: '0',
    marginBottom: 'auto',
    marginLeft: '0',
    marginRight: '0',
    marginTop: 'auto',
    paddingRight: spacing['--t-spacing-2'],
    right: '0',
    top: '0',
  },
  autogrowXs: {
    paddingBlock: 0,
    paddingInline: 5,
    boxSizing: 'border-box',
    height: 20,
  },
  autogrowSm: {
    paddingBlock: 0,
    paddingInline: 5,
    boxSizing: 'border-box',
    height: 24,
  },
  autogrowMd: {
    paddingBlock: 0,
    paddingInline: 5,
    boxSizing: 'border-box',
    height: 28,
  },
  autogrowLg: {
    paddingBlock: 0,
    paddingInline: 5,
    boxSizing: 'border-box',
    height: 32,
  },
});

const ADORNMENT_SIZE_STYLES = {
  xs: styles.adornmentXs,
  sm: styles.adornmentSm,
  md: styles.adornmentMd,
  lg: styles.adornmentLg,
} satisfies Record<TextInputSize, stylex.StyleXStyles>;

const INPUT_SIZE_STYLES = {
  xs: styles.inputXs,
  sm: styles.inputSm,
  md: styles.inputMd,
  lg: styles.inputLg,
} satisfies Record<TextInputSize, stylex.StyleXStyles>;

const LEFT_ICON_SIZE_STYLES = {
  xs: styles.leftIconXs,
  sm: styles.leftIconSm,
  md: styles.leftIconMd,
  lg: styles.leftIconLg,
} satisfies Record<TextInputSize, stylex.StyleXStyles>;

const AUTOGROW_SIZE_STYLES = {
  xs: styles.autogrowXs,
  sm: styles.autogrowSm,
  md: styles.autogrowMd,
  lg: styles.autogrowLg,
} satisfies Record<TextInputSize, stylex.StyleXStyles>;
