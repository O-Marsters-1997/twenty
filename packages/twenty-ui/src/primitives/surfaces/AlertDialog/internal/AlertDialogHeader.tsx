import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type AlertDialogHeaderProps } from '../types/AlertDialogHeaderProps';

export const AlertDialogHeader = ({
  render,
  ref,
  className,
  xstyle,
  ...props
}: WithXstyle<AlertDialogHeaderProps>) =>
  useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(dialogStyles.header, xstyle), className),
    },
  });
