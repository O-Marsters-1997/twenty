import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { type VisuallyHiddenProps } from '../types/VisuallyHiddenProps';

export const VisuallyHidden = ({
  render,
  ref,
  className,
  xstyle,
  ...props
}: VisuallyHiddenProps) => {
  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.root, xstyle), className),
    },
  });
};

const styles = stylex.create({
  root: {
    blockSize: 1,
    borderWidth: 0,
    clip: 'rect(0, 0, 0, 0)',
    inlineSize: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
  },
});
