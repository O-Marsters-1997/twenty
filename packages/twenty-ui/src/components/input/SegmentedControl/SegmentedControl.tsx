import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import * as stylex from '@stylexjs/stylex';

import { Radio } from '@ui/primitives/input/Radio/Radio';

import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { focusStyles } from '../../../styles/focus.stylex';
import { media } from '../../../theme/constants.stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';
import './SegmentedControl.css';
import { type SegmentedControlProps } from './types/SegmentedControlProps';

const interactive =
  ':not(:is([data-checked], [data-disabled], [data-readonly]))';

export const SegmentedControl = <TValue extends string>({
  className,
  itemWidth = 'equal',
  options,
  xstyle,
  ...props
}: SegmentedControlProps<TValue>) => (
  <RadioGroupPrimitive
    {...props}
    {...mergeStylexProps(
      stylex.props(
        styles.container,
        itemWidth === 'content' && styles.containerContentWidth,
        xstyle,
      ),
      className,
    )}
    data-item-width={itemWidth}
  >
    {options.map(
      ({ 'aria-label': ariaLabel, disabled, label, startIcon, value }) => (
        <Radio.Root
          key={value}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel}
          {...stylex.props(
            focusStyles.ring,
            styles.item,
            !isRenderableSlot(label) && styles.iconOnly,
          )}
        >
          {isRenderableSlot(startIcon) && (
            <span
              {...mergeStylexProps(
                stylex.props(styles.icon),
                'tw-segmented-control-icon',
              )}
              aria-hidden
            >
              {startIcon}
            </span>
          )}
          {isRenderableSlot(label) && (
            <span {...stylex.props(styles.label)}>{label}</span>
          )}
        </Radio.Root>
      ),
    )}
  </RadioGroupPrimitive>
);

const styles = stylex.create({
  container: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    blockSize: spacing['--t-spacing-7'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxSizing: 'border-box',
    display: 'inline-grid',
    flexShrink: 0,
    gap: 2,
    gridAutoColumns: 'minmax(0, 1fr)',
    gridAutoFlow: 'column',
    padding: 3,
  },
  containerContentWidth: { gridAutoColumns: 'max-content' },
  item: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':is([data-checked])':
        backgroundTransparent['--t-background-transparent-light'],
      [`:hover${interactive}`]: {
        default: null,
        [media.hoverCapable]:
          backgroundTransparent['--t-background-transparent-lighter'],
      },
    },
    blockSize: '100%',
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'none',
    color: {
      default: fontColor['--t-font-color-secondary'],
      ':is([data-checked])': fontColor['--t-font-color-primary'],
    },
    cursor: {
      default: 'pointer',
      ':is([data-readonly])': 'default',
      ':is([data-disabled])': 'not-allowed',
    },
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    justifyContent: 'center',
    lineHeight: 1.4,
    minInlineSize: 0,
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    transition: {
      default: 'background 0.1s ease, color 0.1s ease',
      [media.reducedMotion]: 'none',
    },
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  iconOnly: { minInlineSize: spacing['--t-spacing-5'], paddingInline: 0 },
  icon: {
    alignItems: 'center',
    blockSize: spacing['--t-spacing-5'],
    display: 'flex',
    flexShrink: 0,
    inlineSize: spacing['--t-spacing-5'],
    justifyContent: 'center',
  },
  label: {
    minInlineSize: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});
