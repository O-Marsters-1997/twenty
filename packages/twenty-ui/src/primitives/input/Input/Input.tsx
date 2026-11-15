import { Input as InputPrimitive } from '@base-ui/react/input';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { InputGroupContext } from '@ui/primitives/input/InputGroup/internal/InputGroupContext';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  background,
  backgroundTransparent,
  borderColor as borderColorTokens,
  borderRadius,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';
import { type InputProps } from './types/InputProps';

export const Input = ({ size, className, xstyle, ...props }: InputProps) => {
  const inputGroup = useContext(InputGroupContext);
  const resolvedSize = size ?? inputGroup?.size ?? 'md';

  return (
    <InputPrimitive
      {...props}
      {...mergeStylexProps(
        stylex.props(
          styles.input,
          resolvedSize === 'sm' && styles.sizeSm,
          isDefined(inputGroup) && styles.grouped,
          xstyle,
        ),
        className,
      )}
    />
  );
};

const invalid = ':is([aria-invalid="true"], [data-invalid])';

const styles = stylex.create({
  input: {
    appearance: 'none',
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    blockSize: 32,
    borderColor: {
      default: borderColorTokens['--t-border-color-medium'],
      ':focus': color['--t-color-blue'],
      [invalid]: borderColorTokens['--t-border-color-danger'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    color: {
      default: fontColor['--t-font-color-primary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
    },
    cursor: { default: null, ':disabled': 'not-allowed' },
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    inlineSize: '100%',
    margin: 0,
    minInlineSize: 0,
    outline: 'none',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    textOverflow: 'ellipsis',
    '::placeholder': {
      color: fontColor['--t-font-color-light'],
      fontWeight: fontWeight['--t-font-weight-medium'],
    },
  },
  sizeSm: { blockSize: 24 },
  grouped: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    blockSize: 'auto',
    borderWidth: 0,
    borderRadius: 0,
    flex: 1,
    paddingInline: 0,
  },
});
