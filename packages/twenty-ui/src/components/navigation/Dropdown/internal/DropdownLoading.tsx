import * as stylex from '@stylexjs/stylex';
import { type ComponentPropsWithRef } from 'react';

import { Text } from '@ui/primitives/typography/Text/Text';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { dropdownStyles } from '../Dropdown.stylex';

export const DropdownLoading = ({
  className,
  ...props
}: ComponentPropsWithRef<'div'>) => (
  <Text
    {...props}
    role="status"
    aria-live="polite"
    aria-busy="true"
    {...mergeStylexProps(stylex.props(dropdownStyles.status), className)}
  />
);
