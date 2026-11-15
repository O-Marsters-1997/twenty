import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';

import { useProvidedTextDirection } from '@ui/primitives/layout/DirectionProvider/internal/useProvidedTextDirection';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  dialogStyles,
  dialogViewportMarker,
} from '../../internal/Dialog.stylex';
import { type DialogViewportProps } from '../types/DialogViewportProps';

export const DialogViewport = ({
  className,
  xstyle,
  ...props
}: WithXstyle<DialogViewportProps>) => {
  const direction = useProvidedTextDirection();

  return (
    <DialogPrimitive.Viewport
      dir={direction}
      {...props}
      {...mergeStylexProps(
        stylex.props(dialogViewportMarker, dialogStyles.viewport, xstyle),
        className,
      )}
    />
  );
};
