import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import { isFunction } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  backgroundTransparent,
  blur,
  borderColor,
  borderRadius,
  boxShadow,
  fontColor,
  spacing,
} from '../../../../theme/tokens.stylex';
import { autocompleteArrowMarker } from '../Autocomplete.stylex';
import { type AutocompletePopupProps } from '../types/AutocompletePopupProps';

export const AutocompletePopup = ({
  width,
  style,
  className,
  xstyle,
  ...props
}: WithXstyle<AutocompletePopupProps>) => (
  <AutocompletePrimitive.Popup
    {...props}
    {...mergeStylexProps(stylex.props(styles.popup, xstyle), className)}
    style={(state) => ({
      width,
      minInlineSize: isDefined(width) ? 0 : undefined,
      ...(isFunction(style) ? style(state) : style),
    })}
  />
);

const transitioning = ':is([data-starting-style], [data-ending-style])';

const styles = stylex.create({
  popup: {
    backdropFilter: blur['--t-blur-medium'],
    background: backgroundTransparent['--t-background-transparent-primary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexDirection: 'column',
    maxBlockSize: 'var(--available-height)',
    maxInlineSize: 'var(--available-width)',
    minInlineSize: 'var(--anchor-width)',
    opacity: { default: null, [transitioning]: 0 },
    outline: 'none',
    overflow: {
      default: 'auto',
      [stylex.when.descendant(':is(*)', autocompleteArrowMarker)]: 'visible',
    },
    overscrollBehavior: 'contain',
    padding: spacing['--t-spacing-1'],
    transitionDuration: '0.15s',
    transitionProperty: 'opacity',
    transitionTimingFunction: {
      default: 'ease-out',
      ':is([data-ending-style])': 'ease-in',
    },
  },
});
