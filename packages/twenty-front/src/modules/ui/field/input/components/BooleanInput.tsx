import * as stylex from '@stylexjs/stylex';
import { useEffect, useState } from 'react';

import { BooleanDisplay } from '@/ui/field/display/components/BooleanDisplay';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    cursor: 'default',
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  containerReadonly: {
    color: fontColor['--t-font-color-tertiary'],
  },
  containerClickable: {
    cursor: 'pointer',
  },
});

type BooleanInputProps = {
  value: boolean;
  onToggle?: (newValue: boolean) => void;
  readonly?: boolean;
  testId?: string;
};

export const BooleanInput = ({
  value,
  onToggle,
  readonly,
  testId,
}: BooleanInputProps) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleClick = () => {
    setInternalValue(!internalValue);
    onToggle?.(!internalValue);
  };

  return (
    <div
      onClick={readonly ? undefined : handleClick}
      data-testid={testId}
      {...stylex.props(
        styles.container,
        readonly && styles.containerReadonly,
        !readonly && styles.containerClickable,
      )}
    >
      <BooleanDisplay value={internalValue} />
    </div>
  );
};
