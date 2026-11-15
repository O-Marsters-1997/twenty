import { type JSX } from 'react';
import { Heading } from 'react-email';

type SubTitleProps = {
  value: JSX.Element | JSX.Element[] | string;
};

export const SubTitle = ({ value }: SubTitleProps) => {
  return (
    <Heading
      as="h3"
      className="font-base text-lg font-semibold text-highlighted"
    >
      {value}
    </Heading>
  );
};
