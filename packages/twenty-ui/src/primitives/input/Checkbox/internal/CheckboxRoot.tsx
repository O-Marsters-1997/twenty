import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { media } from '../../../../theme/constants.stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
} from '../../../../theme/tokens.stylex';
import { type CheckboxRootProps } from '../types/CheckboxRootProps';

export const CheckboxRoot = ({
  size = 'sm',
  variant = 'solid',
  shape = 'square',
  color: colorProp = 'accent',
  hoverable = true,
  className,
  xstyle,
  ...props
}: WithXstyle<CheckboxRootProps>) => (
  <CheckboxPrimitive.Root
    {...props}
    {...mergeStylexProps(
      stylex.props(
        focusStyles.ring,
        styles.root,
        sizeStyles[size],
        variantStyles[variant],
        size === 'md' && variant !== 'soft' && styles.mdBorder,
        shapeStyles[shape],
        colorStyles[colorProp],
        hoverable && styles.hoverable,
        hoverable && size === 'md' && styles.hoverableMd,
        xstyle,
      ),
      className,
    )}
  />
);

const checked = ':is([data-checked], [data-indeterminate])';
const enabled = ':not(:is([data-disabled]))';
const disabledChecked = ':is([data-disabled]):is([data-checked], [data-indeterminate])';

const styles = stylex.create({
  root: {
    '--tw-checkbox-border-color': borderColor['--t-border-color-secondary-inverted'],
    '--tw-checkbox-border-width': '1px',
    '--tw-checkbox-box-radius': borderRadius['--t-border-radius-sm-round'],
    '--tw-checkbox-box-size': '12px',
    '--tw-checkbox-icon-size': '14px',
    '--tw-checkbox-padding': '0px',
    alignItems: 'center',
    cursor: { default: 'pointer', ':is([data-disabled])': 'not-allowed' },
    display: 'inline-flex',
    flexShrink: 0,
    padding: 'var(--tw-checkbox-padding)',
    position: 'relative',
    '::before': {
      background: {
        default: 'transparent',
        [checked + enabled]: 'var(--tw-checkbox-accent)',
        [disabledChecked]: 'var(--tw-checkbox-accent-disabled)',
      },
      blockSize: 'var(--tw-checkbox-box-size)',
      borderColor: {
        default: 'var(--tw-checkbox-border-color)',
        ':is([data-disabled])': borderColor['--t-border-color-strong'],
        [checked + enabled]: 'var(--tw-checkbox-accent)',
        [disabledChecked]: 'var(--tw-checkbox-accent-disabled)',
      },
      borderRadius: 'var(--tw-checkbox-box-radius)',
      borderStyle: 'solid',
      borderWidth: 'var(--tw-checkbox-border-width)',
      boxSizing: 'content-box',
      content: '""',
      display: 'inline-block',
      inlineSize: 'var(--tw-checkbox-box-size)',
    },
  },
  solid: { '--tw-checkbox-border-color': borderColor['--t-border-color-inverted'] },
  outline: {
    '--tw-checkbox-border-color': borderColor['--t-border-color-secondary-inverted'],
  },
  soft: {
    '--tw-checkbox-border-color': borderColor['--t-border-color-medium'],
    '--tw-checkbox-border-width': '1.43px',
  },
  sizeSm: { '--tw-checkbox-box-size': '12px', '--tw-checkbox-icon-size': '14px' },
  sizeMd: { '--tw-checkbox-box-size': '18px', '--tw-checkbox-icon-size': '20px' },
  mdBorder: { '--tw-checkbox-border-width': '1.43px' },
  square: {
    '--tw-checkbox-box-radius': borderRadius['--t-border-radius-sm-round'],
    borderRadius: borderRadius['--t-border-radius-md-round'],
  },
  round: {
    '--tw-checkbox-box-radius': borderRadius['--t-border-radius-rounded'],
    borderRadius: borderRadius['--t-border-radius-rounded'],
  },
  accent: {
    '--tw-checkbox-accent': color['--t-color-blue'],
    '--tw-checkbox-accent-disabled': color['--t-color-blue7'],
    '--tw-checkbox-accent-hover': backgroundTransparent['--t-background-transparent-blue'],
  },
  success: {
    '--tw-checkbox-accent': color['--t-color-green'],
    '--tw-checkbox-accent-disabled': color['--t-color-green7'],
    '--tw-checkbox-accent-hover': backgroundTransparent['--t-background-transparent-green'],
  },
  warning: {
    '--tw-checkbox-accent': color['--t-color-orange'],
    '--tw-checkbox-accent-disabled': color['--t-color-orange7'],
    '--tw-checkbox-accent-hover': backgroundTransparent['--t-background-transparent-orange'],
  },
  hoverable: {
    '--tw-checkbox-padding': '5px',
    backgroundColor: {
      default: null,
      [`:hover:not(:is([data-disabled], [data-checked], [data-indeterminate]))`]: {
        default: null,
        [media.hoverCapable]: backgroundTransparent['--t-background-transparent-light'],
      },
      [`:hover:not(:is([data-disabled])):is([data-checked], [data-indeterminate])`]: {
        default: null,
        [media.hoverCapable]: 'var(--tw-checkbox-accent-hover)',
      },
    },
  },
  hoverableMd: { '--tw-checkbox-padding': '6px' },
});

const sizeStyles = { sm: styles.sizeSm, md: styles.sizeMd };
const variantStyles = {
  solid: styles.solid,
  outline: styles.outline,
  soft: styles.soft,
};
const shapeStyles = { square: styles.square, round: styles.round };
const colorStyles = {
  accent: styles.accent,
  success: styles.success,
  warning: styles.warning,
};
