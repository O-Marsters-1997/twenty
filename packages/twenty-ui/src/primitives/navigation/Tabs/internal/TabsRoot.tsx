import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { tabStyles } from '../../internal/tab/TabStyles.stylex';
import { type TabsRootProps } from '../types/TabsRootProps';

export const TabsRoot = ({
  className,
  xstyle,
  ...props
}: WithXstyle<TabsRootProps>) => (
  <TabsPrimitive.Root
    {...props}
    {...mergeStylexProps(stylex.props(tabStyles.root, xstyle), className)}
  />
);
