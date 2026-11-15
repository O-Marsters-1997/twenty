import { type JSX } from 'react';
import { Text } from 'react-email';

type ShadowTextProps = {
  children: JSX.Element | JSX.Element[] | string;
};

export const ShadowText = ({ children }: ShadowTextProps) => {
  return (
    <Text className="m-0 mb-3 text-sm font-normal leading-base text-tertiary">
      {children}
    </Text>
  );
};
