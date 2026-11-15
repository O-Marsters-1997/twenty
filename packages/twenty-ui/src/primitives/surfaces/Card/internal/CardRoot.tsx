import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../../styles/focus.stylex';
import { cardStyles } from '../Card.stylex';
import { type CardRootProps } from '../types/CardRootProps';

export const CardRoot = ({
  className,
  fullWidth,
  rounded,
  backgroundColor,
  style,
  render,
  ref,
  xstyle,
  ...props
}: WithXstyle<CardRootProps>) => {
  const stylexProps = stylex.props(
    focusStyles.ring,
    cardStyles.owner,
    cardStyles.root,
    fullWidth && cardStyles.fullWidth,
    xstyle,
  );

  return useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylexProps, className),
      'data-full-width': fullWidth || undefined,
      'data-rounded': rounded || undefined,
      style: isDefined(backgroundColor)
        ? ({
            ...stylexProps.style,
            ...style,
            '--card-background-color': backgroundColor,
          } as CSSProperties)
        : { ...stylexProps.style, ...style },
    },
  });
};
