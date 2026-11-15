import { clsx } from 'clsx';
import { type CSSProperties } from 'react';

import { mergeClassNames } from './mergeClassNames';

type StylexProps = {
  className?: string;
  style?: Readonly<CSSProperties>;
};

type ConsumerClassName<TState> =
  | string
  | ((state: TState) => string | undefined)
  | undefined;

export const mergeStylexProps = <TState = never>(
  stylexProps: StylexProps,
  consumerClassName: ConsumerClassName<TState>,
) => ({
  ...stylexProps,
  className:
    typeof consumerClassName === 'function'
      ? mergeClassNames(stylexProps.className ?? '', consumerClassName)
      : clsx(stylexProps.className, consumerClassName),
});
