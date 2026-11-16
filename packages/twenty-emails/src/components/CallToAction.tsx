import { type JSX } from 'react';
import { Button } from 'react-email';

type CallToActionProps = {
  href: string;
  value: JSX.Element | JSX.Element[] | string;
};

export const CallToAction = ({ value, href }: CallToActionProps) => {
  return (
    <Button
      href={href}
      className="inline-flex w-auto rounded-md border border-solid border-shade-light bg-button px-8 py-2 text-md font-semibold text-inverted [box-shadow:0px_2px_4px_0px_rgba(0,0,0,0.04),0px_0px_4px_0px_rgba(0,0,0,0.08)]"
    >
      {value}
    </Button>
  );
};
