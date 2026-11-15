import * as stylex from '@stylexjs/stylex';

import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { type TabsTabProps } from '../../Tabs/types/TabsTabProps';
import { tabStyles } from './TabStyles.stylex';

import './Tab.css';

type TabsTabContentProps = Pick<
  TabsTabProps,
  'children' | 'startIcon' | 'endIcon' | 'badge'
>;

export const TabsTabContent = ({
  children,
  startIcon,
  endIcon,
  badge,
}: TabsTabContentProps) => (
  <span {...stylex.props(tabStyles.content)}>
    {isRenderableSlot(startIcon) && (
      <span
        {...mergeStylexProps(stylex.props(tabStyles.startIcon), 'tw-tabs-icon')}
        aria-hidden
      >
        {startIcon}
      </span>
    )}
    <span {...stylex.props(tabStyles.label)}>{children}</span>
    {isRenderableSlot(endIcon) && (
      <span
        {...mergeStylexProps(stylex.props(tabStyles.startIcon), 'tw-tabs-icon')}
        aria-hidden
      >
        {endIcon}
      </span>
    )}
    {isRenderableSlot(badge) && (
      <span {...stylex.props(tabStyles.badge)}>{badge}</span>
    )}
  </span>
);
