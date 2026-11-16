import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { skeletonStyles } from './Skeleton.stylex';
import { type SkeletonProps } from './types/SkeletonProps';

export const Skeleton = ({
  width,
  height,
  borderRadius,
  baseColor,
  highlightColor,
  animated = true,
  layout = 'inline',
  className,
  style,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<SkeletonProps>) => {
  const stylexProps = stylex.props(
    skeletonStyles.root,
    layout === 'block' && skeletonStyles.layoutBlock,
    animated && skeletonStyles.animated,
    xstyle,
  );

  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    props: {
      'aria-hidden': true,
      ...props,
      'data-skeleton': '',
      'data-animated': animated || undefined,
      'data-layout': layout,
      ...mergeStylexProps(stylexProps, className),
      style: {
        ...stylexProps.style,
        width,
        height,
        borderRadius,
        backgroundColor: baseColor,
        '--skeleton-base-color': baseColor,
        '--skeleton-highlight-color': highlightColor,
        ...style,
      } as CSSProperties,
      children: layout === 'inline' ? '‌' : undefined,
    },
  });
};
