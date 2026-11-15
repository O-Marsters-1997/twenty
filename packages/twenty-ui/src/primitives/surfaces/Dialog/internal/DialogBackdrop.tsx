import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type DialogBackdropProps } from '../types/DialogBackdropProps';

export const DialogBackdrop = ({
  className,
  xstyle,
  ...props
}: WithXstyle<DialogBackdropProps>) => (
  <DialogPrimitive.Backdrop
    {...props}
    {...mergeStylexProps(
      stylex.props(dialogStyles.backdrop, xstyle),
      className,
    )}
  />
);
