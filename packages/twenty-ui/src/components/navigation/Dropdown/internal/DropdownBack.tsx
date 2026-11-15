import * as stylex from '@stylexjs/stylex';

import { IconChevronLeft } from '@ui/icon';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { dropdownStyles } from '../Dropdown.stylex';
import { type DropdownActionItemProps } from '../types/DropdownActionItemProps';
import { DropdownActionItem } from './DropdownActionItem';
import { useDropdownContext } from './useDropdownContext';

export const DropdownBack = ({
  children = 'Back',
  className,
  onClick,
  ...props
}: Omit<
  DropdownActionItemProps,
  'page' | 'closeOnClick' | 'actions' | 'actionsVisibility'
>) => {
  const { goBack, canGoBack } = useDropdownContext();

  return (
    <DropdownActionItem
      {...props}
      {...mergeStylexProps(stylex.props(dropdownStyles.back), className)}
      data-dropdown-back=""
      disabled={props.disabled || !canGoBack}
      startIcon={<IconChevronLeft {...stylex.props(dropdownStyles.backIcon)} />}
      closeOnClick={false}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        goBack();
      }}
    >
      {children}
    </DropdownActionItem>
  );
};
