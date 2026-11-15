import { clsx } from 'clsx';
import { type CSSProperties } from 'react';

import { mergeClassNames } from './mergeClassNames';

type StylexProps = {
  className?: string;
  style?: Readonly<CSSProperties>;
};

type StateClassName<TState> = (state: TState) => string | undefined;

export function mergeStylexProps(
  stylexProps: StylexProps,
  consumerClassName?: string,
): { className: string; style?: Readonly<CSSProperties> };
export function mergeStylexProps<TState>(
  stylexProps: StylexProps,
  consumerClassName?: string | StateClassName<TState>,
): {
  className: string | StateClassName<TState>;
  style?: Readonly<CSSProperties>;
};
export function mergeStylexProps<TState>(
  stylexProps: StylexProps,
  consumerClassName?: string | StateClassName<TState>,
) {
  return {
    ...stylexProps,
    className:
      typeof consumerClassName === 'function'
        ? mergeClassNames(stylexProps.className ?? '', consumerClassName)
        : clsx(stylexProps.className, consumerClassName),
  };
}
