import { type MouseEvent } from 'react';
import { Checkbox } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
});

type CoreObjectTableCheckboxCellProps = {
  checked: boolean;
  indeterminate?: boolean;
  ariaLabel: string;
  onToggle: () => void;
};

export const CoreObjectTableCheckboxCell = ({
  checked,
  indeterminate = false,
  ariaLabel,
  onToggle,
}: CoreObjectTableCheckboxCellProps) => {
  const stopRowNavigation = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div onClick={stopRowNavigation} {...stylex.props(styles.container)}>
      <Checkbox
        checked={checked}
        indeterminate={indeterminate}
        aria-label={ariaLabel}
        onCheckedChange={onToggle}
      />
    </div>
  );
};
