import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { tabStyles } from '../../internal/tab/TabStyles.stylex';
import { type TabsIndicatorProps } from '../types/TabsIndicatorProps';

export const TabsIndicator = ({
  className,
  xstyle,
  ...props
}: WithXstyle<TabsIndicatorProps>) => (
  <TabsPrimitive.Indicator
    {...props}
    {...mergeStylexProps(stylex.props(tabStyles.indicator, xstyle), className)}
  />
);
