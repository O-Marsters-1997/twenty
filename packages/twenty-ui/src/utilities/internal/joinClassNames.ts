import { isNonEmptyString } from '@sniptt/guards';

export const joinClassNames = (...classNames: (string | undefined)[]) =>
  classNames.filter(isNonEmptyString).join(' ');
