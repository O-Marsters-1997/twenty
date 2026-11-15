import { Input as InputPrimitive } from '@base-ui/react/input';
import * as stylex from '@stylexjs/stylex';
import {
  type ChangeEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

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
} from '../../../theme/tokens.stylex';

import { TextareaControl } from './internal/TextareaControl';
import { formatInlineBlockSize } from './internal/formatInlineBlockSize';
import { mergeRefs } from './internal/mergeRefs';
import { observeTextareaWidth } from './internal/observeTextareaWidth';
import { resizeTextareaToContent } from './internal/resizeTextareaToContent';
import { type TextareaProps } from './types/TextareaProps';

export const Textarea = ({
  size = 'md',
  autoResize = false,
  maxRows,
  className,
  xstyle,
  style,
  ref,
  render,
  onChange,
  value,
  rows,
  ...props
}: TextareaProps) => {
  const [textarea, setTextarea] = useState<HTMLTextAreaElement | null>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, setTextarea), [ref]);
  const isControlled = isDefined(value);
  const consumerBlockSize = style?.blockSize;
  const wasAutoResize = useRef(false);

  useLayoutEffect(() => {
    if (!isDefined(textarea)) {
      return;
    }

    const shouldRestoreBlockSize = wasAutoResize.current;
    wasAutoResize.current = autoResize;

    if (autoResize) {
      resizeTextareaToContent(textarea);
      return;
    }

    if (shouldRestoreBlockSize) {
      textarea.style.blockSize = formatInlineBlockSize(consumerBlockSize);
    }
  }, [textarea, autoResize, value, maxRows, rows, size, consumerBlockSize]);

  useLayoutEffect(() => {
    if (!autoResize || !isDefined(textarea)) {
      return;
    }

    let isActive = true;
    const handleReset = (event: Event) => {
      requestAnimationFrame(() => {
        if (isActive && !event.defaultPrevented) {
          resizeTextareaToContent(textarea);
        }
      });
    };

    const form = textarea.form;
    const stopObservingWidth = observeTextareaWidth(textarea);

    form?.addEventListener('reset', handleReset);

    return () => {
      isActive = false;
      form?.removeEventListener('reset', handleReset);
      stopObservingWidth?.();
    };
  }, [textarea, autoResize, props.form]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize && !isControlled) {
      resizeTextareaToContent(event.currentTarget);
    }

    onChange?.(event);
  };

  const stylexProps = stylex.props(
    styles.textarea,
    size === 'sm' ? styles.sizeSm : styles.sizeMd,
    isDefined(maxRows) && styles.maxRows(maxRows, size === 'sm' ? 4 : 8),
    xstyle,
  );

  const {
    'aria-describedby': ariaDescribedBy,
    id,
    name,
    disabled,
    autoFocus,
    defaultValue,
    onValueChange,
    ...nativeProps
  } = props;

  const controlProps = {
    'aria-describedby': ariaDescribedBy,
    id,
    name,
    disabled,
    autoFocus,
    defaultValue,
    onValueChange,
  };

  return (
    <InputPrimitive
      {...controlProps}
      render={(elementProps, state) => (
        <TextareaControl
          controlProps={elementProps}
          nativeProps={{
            ...nativeProps,
            rows,
            onChange: handleChange,
            ref: mergedRef,
          }}
          state={state}
          render={render}
        />
      )}
      value={value}
      {...mergeStylexProps(stylexProps, className)}
      style={{ ...stylexProps.style, ...style }}
      data-auto-resize={autoResize || undefined}
    />
  );
};

const invalid = ':is([aria-invalid="true"], [data-invalid])';

const styles = stylex.create({
  textarea: {
    appearance: 'none',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus': color['--t-color-blue'],
      [invalid]: borderColor['--t-border-color-danger'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    color: {
      default: fontColor['--t-font-color-primary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
    },
    cursor: { default: null, ':disabled': 'not-allowed' },
    display: 'block',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    inlineSize: '100%',
    lineHeight: '16px',
    margin: 0,
    outline: 'none',
    overflow: 'auto',
    paddingInline: spacing['--t-spacing-2'],
    resize: 'none',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  sizeSm: { paddingBlock: spacing['--t-spacing-1'] },
  sizeMd: { paddingBlock: spacing['--t-spacing-2'] },
  maxRows: (rows: number, paddingBlock: number) => ({
    maxBlockSize: `calc(${rows} * 1lh + ${2 * paddingBlock + 2}px)`,
  }),
});
