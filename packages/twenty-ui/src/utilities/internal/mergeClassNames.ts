import { isFunction } from '@sniptt/guards';

import { joinClassNames } from './joinClassNames';

export const mergeClassNames =
  <TState>(
    baseClassName: string,
    consumerClassName:
      | string
      | ((state: TState) => string | undefined)
      | undefined,
  ) =>
  (state: TState) =>
    joinClassNames(
      baseClassName,
      isFunction(consumerClassName)
        ? consumerClassName(state)
        : consumerClassName,
    );
