import { type ReactNode } from 'react';
import { type TipTapMark } from 'twenty-shared/utils';

export const underline = (_: TipTapMark, children: ReactNode): ReactNode => {
  return <span className="underline">{children}</span>;
};
