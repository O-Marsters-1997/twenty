import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type AlertDialogTitleProps } from '../types/AlertDialogTitleProps';

export const AlertDialogTitle = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AlertDialogTitleProps>) => (
  <AlertDialogPrimitive.Title
    {...props}
    {...mergeStylexProps(stylex.props(dialogStyles.title, xstyle), className)}
  />
);
