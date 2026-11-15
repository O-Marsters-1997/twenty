import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';

import { Heading } from '@ui/primitives/typography/Heading/Heading';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { spacing } from '../../../../theme/tokens.stylex';
import { type DialogTitleProps } from '../types/DialogTitleProps';

export const DialogTitle = ({
  level = 2,
  size = 'lg',
  color = 'primary',
  className,
  xstyle,
  render,
  ...props
}: WithXstyle<DialogTitleProps>) => (
  <DialogPrimitive.Title
    {...props}
    {...mergeStylexProps(stylex.props(styles.title, xstyle), className)}
    render={<Heading level={level} size={size} color={color} render={render} />}
  />
);

const styles = stylex.create({
  title: {
    marginBlockEnd: `var(--tw-dialog-title-margin-block-end, ${spacing['--t-spacing-4']})`,
    textAlign: 'center',
  },
});
