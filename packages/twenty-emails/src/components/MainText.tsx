import { type JSX } from 'react';
import { Text } from 'react-email';

type MainTextProps = {
  children: JSX.Element | JSX.Element[] | string;
};

export const MainText = ({ children }: MainTextProps) => {
  return (
    <Text className="font-base text-md font-normal leading-base text-primary">
      {children}
    </Text>
  );
};
