import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';

import { useProvidedTextDirection } from '@ui/primitives/layout/DirectionProvider/internal/useProvidedTextDirection';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  dialogPopupMarker,
  dialogPopupSizeStyles,
  dialogStyles,
} from '../../internal/Dialog.stylex';
import { type DialogPopupProps } from '../types/DialogPopupProps';

export const DialogPopup = ({
  size = 'md',
  className,
  xstyle,
  ...props
}: WithXstyle<DialogPopupProps>) => {
  const direction = useProvidedTextDirection();

  return (
    <DialogPrimitive.Popup
      dir={direction}
      {...props}
      data-size={size}
      {...mergeStylexProps(
        stylex.props(
          dialogPopupMarker,
          dialogStyles.popup,
          size !== 'md' && dialogPopupSizeStyles[size],
          xstyle,
        ),
        className,
      )}
    />
  );
};
