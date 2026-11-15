import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { dropdownStyles } from '../Dropdown.stylex';
import { type DropdownHeaderProps } from '../types/DropdownHeaderProps';

export const DropdownHeader = ({
  render,
  ref,
  className,
  ...props
}: DropdownHeaderProps) =>
  useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(dropdownStyles.header), className),
    },
  });
