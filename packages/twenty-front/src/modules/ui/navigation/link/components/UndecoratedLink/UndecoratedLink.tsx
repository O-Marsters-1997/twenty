import * as stylex from '@stylexjs/stylex';
import React from 'react';
import { Link } from 'react-router-dom';

const styles = stylex.create({
  undecoratedLink: {
    textDecoration: 'none',
  },
  fullWidth: {
    width: '100%',
  },
});

type UndecoratedLinkProps = {
  to: string | number;
  children: React.ReactNode;
  replace?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  fullWidth?: boolean;
};

export const UndecoratedLink = ({
  children,
  to,
  replace = false,
  onClick,
  fullWidth = false,
}: UndecoratedLinkProps) => {
  return (
    <Link
      to={to as string}
      replace={replace}
      onClick={onClick}
      {...stylex.props(styles.undecoratedLink, fullWidth && styles.fullWidth)}
    >
      {children}
    </Link>
  );
};
