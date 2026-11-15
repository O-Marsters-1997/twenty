import { useDirection } from '@base-ui/react/direction-provider';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { tabStyles } from '../../internal/tab/TabStyles.stylex';
import { type TabsListProps } from '../types/TabsListProps';
import { focusNextEnabledTab } from './focusNextEnabledTab';

export const TabsList = ({
  className,
  xstyle,
  onKeyDown,
  loopFocus = true,
  ...props
}: WithXstyle<TabsListProps>) => {
  const direction = useDirection();

  const handleKeyDown: TabsListProps['onKeyDown'] = (event) => {
    onKeyDown?.(event);

    if (event.defaultPrevented) {
      event.preventBaseUIHandler();
      return;
    }

    if (event.baseUIHandlerPrevented) {
      return;
    }

    focusNextEnabledTab({ event, direction, loopFocus });
  };

  return (
    <TabsPrimitive.List
      {...props}
      loopFocus={loopFocus}
      onKeyDown={handleKeyDown}
      {...mergeStylexProps(stylex.props(tabStyles.list, xstyle), className)}
    />
  );
};
