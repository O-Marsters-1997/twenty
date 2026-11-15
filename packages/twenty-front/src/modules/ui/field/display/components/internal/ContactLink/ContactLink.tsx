import * as stylex from '@stylexjs/stylex';
import * as React from 'react';

import { getSafeUrl, isDefined } from 'twenty-shared/utils';
import { borderColor, fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    color: 'inherit',
    maxWidth: '100%',
    overflow: 'hidden',
    textDecorationLine: 'underline',
    textDecorationColor: {
      default: borderColor['--t-border-color-strong'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
  maxWidth: (maxWidth: number) => ({
    maxWidth: `${maxWidth}px`,
  }),
});

type ContactLinkProps = {
  href: string;
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  maxWidth?: number;
};

export const ContactLink = ({
  href,
  children,
  onClick,
  maxWidth,
}: ContactLinkProps) => {
  return (
    <a
      {...stylex.props(
        styles.root,
        isDefined(maxWidth) && styles.maxWidth(maxWidth),
      )}
      target="_blank"
      dir="ltr"
      onClick={onClick}
      href={getSafeUrl(href)}
    >
      {children}
    </a>
  );
};
