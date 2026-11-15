import * as stylex from '@stylexjs/stylex';
import { borderColor } from 'twenty-ui/theme/tokens.stylex';
import { forwardRef } from 'react';

import {
  itemsLayout,
  separatorMarker,
} from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer.stylex';

const styles = stylex.create({
  root: {
    backgroundColor: borderColor['--t-border-color-light'],
    marginInline: `calc(0px - ${itemsLayout.padding})`,
    minHeight: '1px',
    width: `calc(100% + ${itemsLayout.padding} + ${itemsLayout.padding})`,
  },
});

export const DropdownMenuSeparator = forwardRef<HTMLDivElement>((_, ref) => {
  return <div ref={ref} {...stylex.props(separatorMarker, styles.root)} />;
});

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
