import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { dropdownStyles } from '../Dropdown.stylex';
import { type DropdownTitleProps } from '../types/DropdownTitleProps';
import { useDropdownContext } from './useDropdownContext';
import { useRegisterDropdownLabelElement } from './useRegisterDropdownLabelElement';

export const DropdownTitle = ({
  className,
  render,
  ref,
  ...props
}: DropdownTitleProps) => {
  const { registerTitle } = useDropdownContext();
  const registerTitleElement = useRegisterDropdownLabelElement(registerTitle);
  const mergedRef = useMergedRefs(ref, registerTitleElement);

  return (
    <PopoverPrimitive.Title
      {...props}
      ref={mergedRef}
      render={render ?? <div />}
      {...mergeStylexProps(stylex.props(dropdownStyles.title), className)}
    />
  );
};
