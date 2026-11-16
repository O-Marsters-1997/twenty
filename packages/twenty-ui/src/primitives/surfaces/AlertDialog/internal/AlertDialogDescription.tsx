import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type AlertDialogDescriptionProps } from '../types/AlertDialogDescriptionProps';

export const AlertDialogDescription = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AlertDialogDescriptionProps>) => (
  <AlertDialogPrimitive.Description
    {...props}
    {...mergeStylexProps(
      stylex.props(dialogStyles.description, xstyle),
      className,
    )}
  />
);
