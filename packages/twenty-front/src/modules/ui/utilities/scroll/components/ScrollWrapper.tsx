import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';

import { ScrollWrapperInitEffect } from '@/ui/utilities/scroll/components/internal/ScrollWrapperInitEffect';
import { ScrollWrapperComponentInstanceContext } from '@/ui/utilities/scroll/states/contexts/ScrollWrapperComponentInstanceContext';
import { scrollWrapperScrollBottomComponentState } from '@/ui/utilities/scroll/states/scrollWrapperScrollBottomComponentState';
import { scrollWrapperScrollLeftComponentState } from '@/ui/utilities/scroll/states/scrollWrapperScrollLeftComponentState';
import { scrollWrapperScrollTopComponentState } from '@/ui/utilities/scroll/states/scrollWrapperScrollTopComponentState';
import { getScrollBottomInPx } from '@/ui/utilities/scroll/utils/getScrollBottomInPx';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';

const styles = stylex.create({
  root: {
    height: '100%',
    overflowX: {
      default: 'hidden',
      ':is(.scroll-wrapper-x-enabled)': 'overlay',
    },
    overflowY: {
      default: 'hidden',
      ':is(.scroll-wrapper-y-enabled)': 'overlay',
    },
    width: '100%',
  },
  rootAutoHeight: {
    height: 'auto',
  },
});

export type ScrollWrapperProps = {
  children: React.ReactNode;
  className?: string;
  defaultEnableXScroll?: boolean;
  defaultEnableYScroll?: boolean;
  autoHeight?: boolean;
  componentInstanceId: string;
};

export const ScrollWrapper = ({
  componentInstanceId,
  children,
  className,
  defaultEnableXScroll = true,
  defaultEnableYScroll = true,
  autoHeight = false,
}: ScrollWrapperProps) => {
  const setScrollWrapperScrollTop = useSetAtomComponentState(
    scrollWrapperScrollTopComponentState,
    componentInstanceId,
  );

  const setScrollWrapperScrollLeft = useSetAtomComponentState(
    scrollWrapperScrollLeftComponentState,
    componentInstanceId,
  );

  const setScrollWrapperScrollBottom = useSetAtomComponentState(
    scrollWrapperScrollBottomComponentState,
    componentInstanceId,
  );

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollWrapperScrollTop(target.scrollTop);
    setScrollWrapperScrollLeft(target.scrollLeft);
    setScrollWrapperScrollBottom(getScrollBottomInPx(target));
  };

  const rootProps = stylex.props(
    styles.root,
    autoHeight && styles.rootAutoHeight,
  );

  return (
    <ScrollWrapperComponentInstanceContext.Provider
      value={{ instanceId: componentInstanceId }}
    >
      <ScrollWrapperInitEffect
        defaultEnableXScroll={defaultEnableXScroll}
        defaultEnableYScroll={defaultEnableYScroll}
      />
      <div
        id={`scroll-wrapper-${componentInstanceId}`}
        onScroll={handleScroll}
        {...rootProps}
        className={[rootProps.className, className].filter(isDefined).join(' ')}
      >
        {children}
      </div>
    </ScrollWrapperComponentInstanceContext.Provider>
  );
};
