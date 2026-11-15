import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  dialogPopupMarker,
  dialogPopupSizeStyles,
  dialogStyles,
} from '../../internal/Dialog.stylex';
import { type AlertDialogPopupProps } from '../types/AlertDialogPopupProps';

export const AlertDialogPopup = ({
  size = 'md',
  className,
  xstyle,
  ...props
}: WithXstyle<AlertDialogPopupProps>) => (
  <AlertDialogPrimitive.Popup
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
