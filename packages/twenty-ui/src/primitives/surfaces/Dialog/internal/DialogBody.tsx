import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type DialogBodyProps } from '../types/DialogBodyProps';

export const DialogBody = ({
  render,
  ref,
  className,
  xstyle,
  ...props
}: WithXstyle<DialogBodyProps>) =>
  useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(dialogStyles.body, xstyle), className),
    },
  });
