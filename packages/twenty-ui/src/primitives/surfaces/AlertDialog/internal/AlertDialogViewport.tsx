import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';

import { useProvidedTextDirection } from '@ui/primitives/layout/DirectionProvider/internal/useProvidedTextDirection';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  dialogStyles,
  dialogViewportMarker,
} from '../../internal/Dialog.stylex';
import { type AlertDialogViewportProps } from '../types/AlertDialogViewportProps';

export const AlertDialogViewport = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AlertDialogViewportProps>) => {
  const direction = useProvidedTextDirection();

  return (
    <AlertDialogPrimitive.Viewport
      dir={direction}
      {...props}
      {...mergeStylexProps(
        stylex.props(dialogViewportMarker, dialogStyles.viewport, xstyle),
        className,
      )}
    />
  );
};
