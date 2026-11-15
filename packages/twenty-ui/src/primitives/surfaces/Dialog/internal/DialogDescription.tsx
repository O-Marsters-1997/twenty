import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type DialogDescriptionProps } from '../types/DialogDescriptionProps';

export const DialogDescription = ({
  className,
  xstyle,
  ...props
}: WithXstyle<DialogDescriptionProps>) => (
  <DialogPrimitive.Description
    {...props}
    {...mergeStylexProps(
      stylex.props(dialogStyles.description, xstyle),
      className,
    )}
  />
);
