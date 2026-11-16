import { type JSX } from 'react';
import { Heading } from 'react-email';

type TitleProps = {
  value: JSX.Element | JSX.Element[] | string;
};

export const Title = ({ value }: TitleProps) => {
  return (
    <Heading
      as="h1"
      className="font-base text-xl font-semibold text-highlighted"
    >
      {value}
    </Heading>
  );
};
