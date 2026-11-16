import { type JSX } from 'react';
import { Link as EmailLink } from 'react-email';

const LINK_COLOR_CLASS_NAMES = {
  tertiary: 'text-tertiary',
  blue: 'text-blue',
};

type LinkProps = {
  value: JSX.Element | JSX.Element[] | string;
  href: string;
  color?: keyof typeof LINK_COLOR_CLASS_NAMES;
};

export const Link = ({ value, href, color = 'tertiary' }: LinkProps) => {
  return (
    <EmailLink
      href={href}
      className={`underline ${LINK_COLOR_CLASS_NAMES[color]}`}
    >
      {value}
    </EmailLink>
  );
};
