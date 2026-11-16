import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type AlertDialogBackdropProps } from '../types/AlertDialogBackdropProps';

export const AlertDialogBackdrop = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AlertDialogBackdropProps>) => (
  <AlertDialogPrimitive.Backdrop
    {...props}
    {...mergeStylexProps(
      stylex.props(dialogStyles.backdrop, xstyle),
      className,
    )}
  />
);
