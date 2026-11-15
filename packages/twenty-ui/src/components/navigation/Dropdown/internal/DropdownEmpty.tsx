import * as stylex from '@stylexjs/stylex';
import { type ComponentPropsWithRef } from 'react';

import { Text } from '@ui/primitives/typography/Text/Text';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { dropdownStyles } from '../Dropdown.stylex';

export const DropdownEmpty = ({
  className,
  xstyle,
  ...props
}: WithXstyle<ComponentPropsWithRef<'div'>>) => (
  <Text
    {...props}
    role="status"
    aria-live="polite"
    {...mergeStylexProps(
      stylex.props(dropdownStyles.status, xstyle),
      className,
    )}
  />
);
