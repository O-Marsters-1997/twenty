import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { media } from '../../../../theme/constants.stylex';
import {
  background,
  borderColor,
  borderRadius,
  color,
  colorTransparent,
  fontColor,
  fontSize,
  fontWeight,
  grayScale,
  spacing,
} from '../../../../theme/tokens.stylex';
import { radioRootMarker } from '../Radio.stylex';
import { type RadioProps } from '../types/RadioProps';
import { RadioIndicator } from './RadioIndicator';
import { RadioRoot } from './RadioRoot';

export const RadioComponent = <TValue,>({
  children,
  className,
  xstyle,
  size = 'sm',
  variant = 'default',
  render = variant === 'card' ? <div /> : undefined,
  ...props
}: WithXstyle<RadioProps<TValue>>) => {
  const isCard = variant === 'card';

  return (
    <RadioRoot
      {...props}
      render={render}
      {...mergeStylexProps(
        stylex.props(
          radioRootMarker,
          focusStyles.ring,
          styles.root,
          isCard && styles.card,
          xstyle,
        ),
        className,
      )}
    >
      <span
        {...stylex.props(
          styles.control,
          size === 'sm' ? styles.controlSm : styles.controlMd,
          isCard && styles.cardControl,
        )}
        aria-hidden
      >
        <RadioIndicator
          {...stylex.props(
            styles.indicator,
            size === 'md' && styles.indicatorMd,
          )}
        />
      </span>
      {isCard ? (
        <span {...stylex.props(styles.cardContent)}>{children}</span>
      ) : (
        children
      )}
    </RadioRoot>
  );
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    cursor: {
      default: 'pointer',
      ':is([data-disabled])': 'not-allowed',
      ':is([data-readonly])': 'default',
    },
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-2'],
    inlineSize: 'fit-content',
    opacity: { default: null, ':is([data-disabled])': 0.32 },
    verticalAlign: 'middle',
  },
  card: {
    backgroundColor: {
      default: background['--t-background-secondary'],
      ':hover': background['--t-background-tertiary'],
    },
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    inlineSize: '100%',
    padding: 0,
    position: 'relative',
    textAlign: 'start',
  },
  control: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      [stylex.when.ancestor(':is([data-checked])', radioRootMarker)]:
        color['--t-color-blue'],
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly], [data-checked]))',
        radioRootMarker,
      )]: {
        default: null,
        [media.hoverCapable]: background['--t-background-tertiary'],
      },
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly])):is([data-checked])',
        radioRootMarker,
      )]: { default: null, [media.hoverCapable]: color['--t-color-blue'] },
    },
    borderColor: fontColor['--t-font-color-secondary'],
    borderRadius: borderRadius['--t-border-radius-rounded'],
    borderStyle: {
      default: 'solid',
      [stylex.when.ancestor(':is([data-checked])', radioRootMarker)]: 'none',
    },
    borderWidth: 1,
    boxSizing: 'content-box',
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    marginInlineStart: 3,
    opacity: {
      default: null,
      [stylex.when.ancestor(':is([data-disabled])', radioRootMarker)]: 0.375,
    },
    outlineColor: {
      default: null,
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly], [data-checked]))',
        radioRootMarker,
      )]: {
        default: null,
        [media.hoverCapable]: background['--t-background-tertiary'],
      },
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly])):is([data-checked])',
        radioRootMarker,
      )]: {
        default: null,
        [media.hoverCapable]: colorTransparent['--t-color-transparent-blue2'],
      },
    },
    outlineStyle: {
      default: null,
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly], [data-checked]))',
        radioRootMarker,
      )]: { default: null, [media.hoverCapable]: 'solid' },
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly])):is([data-checked])',
        radioRootMarker,
      )]: { default: null, [media.hoverCapable]: 'solid' },
    },
    outlineWidth: {
      default: null,
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly], [data-checked]))',
        radioRootMarker,
      )]: { default: null, [media.hoverCapable]: 4 },
      [stylex.when.ancestor(
        ':hover:not(:is([data-disabled], [data-readonly])):is([data-checked])',
        radioRootMarker,
      )]: { default: null, [media.hoverCapable]: 4 },
    },
    transform: {
      default: 'scale(0.95)',
      [stylex.when.ancestor(':is([data-checked])', radioRootMarker)]:
        'scale(1.05)',
    },
    transition: {
      default: 'transform 0.3s ease',
      [media.reducedMotion]: 'none',
    },
  },
  controlSm: { blockSize: 16, inlineSize: 16 },
  controlMd: { blockSize: 18, inlineSize: 18 },
  cardControl: {
    insetBlockStart: spacing['--t-spacing-2'],
    insetInlineEnd: spacing['--t-spacing-2'],
    position: 'absolute',
  },
  cardContent: {
    display: 'flex',
    paddingBlock: spacing['--t-spacing-4'],
    paddingInline: spacing['--t-spacing-3'],
    inlineSize: '100%',
  },
  indicator: {
    backgroundColor: grayScale['--t-gray-scale-gray1'],
    blockSize: 6,
    borderRadius: '50%',
    inlineSize: 6,
  },
  indicatorMd: { blockSize: 8, inlineSize: 8 },
});
