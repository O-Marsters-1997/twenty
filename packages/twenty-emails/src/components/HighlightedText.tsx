import { Text } from 'react-email';
import { type JSX } from 'react';

type HighlightedTextProps = {
  value: JSX.Element | JSX.Element[] | string | undefined;
  centered?: boolean;
};

export const HighlightedText = ({ value }: HighlightedTextProps) => {
  return (
    <Text className="rounded-sm bg-highlight px-2 py-1 text-lg leading-[24px] font-semibold text-highlighted">
      {value}
    </Text>
  );
};
