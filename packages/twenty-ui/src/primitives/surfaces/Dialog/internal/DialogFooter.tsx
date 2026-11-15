import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dialogStyles } from '../../internal/Dialog.stylex';
import { type DialogFooterProps } from '../types/DialogFooterProps';

export const DialogFooter = ({
  render,
  ref,
  className,
  xstyle,
  ...props
}: WithXstyle<DialogFooterProps>) =>
  useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(dialogStyles.footer, xstyle), className),
    },
  });
