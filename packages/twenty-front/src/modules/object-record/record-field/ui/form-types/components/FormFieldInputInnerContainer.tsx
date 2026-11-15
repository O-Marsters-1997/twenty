import { type FormFieldInputVariant } from '@/ui/input/types/FormFieldInputVariant';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { useRemoveFocusItemFromFocusStackOnUnmount } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackOnUnmount';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import * as stylex from '@stylexjs/stylex';
import { cx } from '@linaria/core';
import { forwardRef, type HTMLAttributes, type Ref } from 'react';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';

type FormFieldInputInnerContainerProps = {
  hasRightElement: boolean;
  hoverable?: boolean;
  multiline?: boolean;
  readonly?: boolean;
  preventFocusStackUpdate?: boolean;
  enableGlobalEscapeHotkeysConflictingWithKeyboard?: boolean;
  formFieldInputInstanceId: string;
  variant?: FormFieldInputVariant;
};

export const FormFieldInputInnerContainer = forwardRef(
  (
    {
      className,
      children,
      onFocus,
      onBlur,
      hasRightElement,
      hoverable,
      multiline,
      preventFocusStackUpdate = false,
      enableGlobalEscapeHotkeysConflictingWithKeyboard = true,
      onClick,
      formFieldInputInstanceId,
      variant = 'default',
    }: HTMLAttributes<HTMLDivElement> & FormFieldInputInnerContainerProps,
    ref: Ref<HTMLDivElement>,
  ) => {
    const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
    const { removeFocusItemFromFocusStackById } =
      useRemoveFocusItemFromFocusStackById();

    useRemoveFocusItemFromFocusStackOnUnmount({
      focusId: formFieldInputInstanceId,
      isEnabled: !preventFocusStackUpdate,
    });

    const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
      onFocus?.(e);

      if (!preventFocusStackUpdate) {
        pushFocusItemToFocusStack({
          focusId: formFieldInputInstanceId,
          component: {
            type: FocusComponentType.FORM_FIELD_INPUT,
            instanceId: formFieldInputInstanceId,
          },
          globalHotkeysConfig: {
            enableGlobalHotkeysConflictingWithKeyboard: false,
            enableGlobalEscapeHotkeysConflictingWithKeyboard,
          },
        });
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      onBlur?.(e);

      if (!preventFocusStackUpdate) {
        removeFocusItemFromFocusStackById({
          focusId: formFieldInputInstanceId,
        });
      }
    };

    const hasRoundedRightCorners = multiline === true || !hasRightElement;

    const containerProps = stylex.props(
      styles.container,
      multiline && styles.multiline,
      variant === 'transparent'
        ? styles.transparent
        : [
            styles.default,
            hoverable && styles.defaultHoverable,
            hasRoundedRightCorners && styles.defaultRoundedRight,
          ],
    );

    return (
      <div
        ref={ref}
        className={cx(className, containerProps.className)}
        style={containerProps.style}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={onClick}
      >
        {children}
      </div>
    );
  },
);

const styles = stylex.create({
  container: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    width: '100%',
    '::-webkit-scrollbar': {
      display: 'none',
    },
  },
  multiline: {
    alignItems: 'flex-start',
    overflowY: 'auto',
  },
  transparent: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
  },
  default: {
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderTopColor: borderColor['--t-border-color-medium'],
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderBottomColor: borderColor['--t-border-color-medium'],
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderLeftColor: borderColor['--t-border-color-medium'],
    borderLeftStyle: 'solid',
    borderLeftWidth: 1,
    borderRightWidth: 0,
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  defaultHoverable: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
  },
  defaultRoundedRight: {
    borderRightColor: borderColor['--t-border-color-medium'],
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
  },
});
