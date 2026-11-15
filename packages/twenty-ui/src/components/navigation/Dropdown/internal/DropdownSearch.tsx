import * as stylex from '@stylexjs/stylex';

import { Input } from '@ui/primitives/input/Input/Input';

import { dropdownStyles } from '../Dropdown.stylex';
import { type DropdownSearchProps } from '../types/DropdownSearchProps';
import { useDropdownContext } from './useDropdownContext';

export const DropdownSearch = ({
  onValueChange,
  xstyle,
  ...props
}: DropdownSearchProps) => {
  const { searchTargetId } = useDropdownContext();

  return (
    <div {...stylex.props(dropdownStyles.searchContainer)}>
      <Input
        type="search"
        autoComplete="off"
        aria-activedescendant={searchTargetId}
        {...props}
        data-dropdown-search=""
        xstyle={[dropdownStyles.search, xstyle]}
        onValueChange={(value) => onValueChange?.(value)}
      />
    </div>
  );
};
