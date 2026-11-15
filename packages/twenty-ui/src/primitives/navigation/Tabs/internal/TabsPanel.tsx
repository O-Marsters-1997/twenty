import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { tabStyles } from '../../internal/tab/TabStyles.stylex';
import { type TabsPanelProps } from '../types/TabsPanelProps';

export const TabsPanel = ({
  className,
  xstyle,
  ...props
}: WithXstyle<TabsPanelProps>) => (
  <TabsPrimitive.Panel
    {...props}
    {...mergeStylexProps(
      stylex.props(focusStyles.ring, tabStyles.panel, xstyle),
      className,
    )}
  />
);
