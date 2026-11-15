import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { tabMarker } from '../../internal/tab/Tab.stylex';
import { tabStyles } from '../../internal/tab/TabStyles.stylex';
import { TabsTabContent } from '../../internal/tab/TabsTabContent';
import { type TabsTabProps } from '../types/TabsTabProps';

export const TabsTab = ({
  className,
  xstyle,
  children,
  startIcon,
  endIcon,
  badge,
  highlighted = false,
  size = 'sm',
  ...props
}: WithXstyle<TabsTabProps>) => (
  <TabsPrimitive.Tab
    {...props}
    {...mergeStylexProps(
      stylex.props(tabMarker, focusStyles.ring, tabStyles.tab, xstyle),
      className,
    )}
    data-size={size}
    data-highlighted={highlighted || undefined}
  >
    <TabsTabContent startIcon={startIcon} endIcon={endIcon} badge={badge}>
      {children}
    </TabsTabContent>
  </TabsPrimitive.Tab>
);
