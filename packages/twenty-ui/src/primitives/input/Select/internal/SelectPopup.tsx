import { Select as SelectPrimitive } from '@base-ui/react/select';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { backgroundTransparent, blur, borderColor, borderRadius, boxShadow, fontColor, spacing } from '../../../../theme/tokens.stylex';
import { type SelectPopupProps } from '../types/SelectPopupProps';

export const SelectPopup = ({
  className,
  xstyle,
  ...props
}: WithXstyle<SelectPopupProps>) => (
  <SelectPrimitive.Popup
    {...props}
    {...mergeStylexProps(stylex.props(styles.popup, xstyle), className)}
  />
);

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
    maxBlockSize: 'var(--available-height)',
    maxInlineSize: 'var(--available-width)',
    margin: 0,
    minInlineSize: 'var(--anchor-width)',
    opacity: {
      default: null,
      ':is([data-starting-style], [data-ending-style])': 0,
    },
    outline: 'none',
    overflow: 'auto',
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
