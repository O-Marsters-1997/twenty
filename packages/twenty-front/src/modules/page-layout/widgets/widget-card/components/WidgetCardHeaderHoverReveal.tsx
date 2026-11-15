import { widgetCardHoveredComponentFamilyState } from '@/page-layout/widgets/states/widgetCardHoveredComponentFamilyState';
import { WidgetComponentInstanceContext } from '@/page-layout/widgets/states/contexts/WidgetComponentInstanceContext';
import { useComponentInstanceStateContext } from '@/ui/utilities/state/component-state/hooks/useComponentInstanceStateContext';
import { useIsMobile } from 'twenty-ui/utilities';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { type ReactNode } from 'react';
import { animationDuration } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type WidgetCardHeaderHoverRevealProps = {
  children: ReactNode;
};

// Touch devices have no hover, so the content stays visible on mobile.
export const WidgetCardHeaderHoverReveal = ({
  children,
}: WidgetCardHeaderHoverRevealProps) => {
  const widgetComponentInstanceId = useComponentInstanceStateContext(
    WidgetComponentInstanceContext,
  );
  const isMobile = useIsMobile();

  const widgetCardHovered = useAtomComponentFamilyStateValue(
    widgetCardHoveredComponentFamilyState,
    widgetComponentInstanceId?.instanceId ?? '',
  );

  return (
    <div
      {...stylex.props(
        styles.hoverReveal,
        isMobile || widgetCardHovered ? styles.visible : styles.hidden,
      )}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  hoverReveal: {
    transitionDuration: `${animationDuration['--t-animation-duration-instant']}s`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease',
  },
  visible: { opacity: 1, pointerEvents: 'auto' },
  hidden: { opacity: 0, pointerEvents: 'none' },
});
