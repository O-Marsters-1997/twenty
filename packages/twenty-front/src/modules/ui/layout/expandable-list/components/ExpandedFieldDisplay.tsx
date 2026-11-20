import { zIndex } from '@/ui/layout/constants/layout.stylex';
import { OverlayContainer } from '@/ui/layout/overlay/components/OverlayContainer';
import { useListenClickOutside } from '@/ui/utilities/pointer-event/hooks/useListenClickOutside';
import { flip, FloatingPortal, offset, useFloating } from '@floating-ui/react';
import { type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type ExpandedFieldDisplayProps = {
  anchorElement?: HTMLElement;
  children: ReactNode;
  onClickOutside?: () => void;
};

const styles = stylex.create({
  container: {
    display: 'flex',
    zIndex: zIndex.dropdownPortalBelowModal,
  },
  expandedFieldContainer: {
    gap: spacing['--t-spacing-1'],
    overflow: 'auto',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '300px',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    width: '400px',
  },
});

export const ExpandedFieldDisplay = ({
  anchorElement,
  children,
  onClickOutside,
}: ExpandedFieldDisplayProps) => {
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [
      flip(),
      offset({
        mainAxis: -29,
        crossAxis: -10,
      }),
    ],
    elements: { reference: anchorElement },
  });

  useListenClickOutside({
    refs: [refs.domReference, refs.floating],
    callback: () => {
      onClickOutside?.();
    },
    listenerId: 'expanded-field-display',
  });

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        {...stylex.props(styles.container)}
        style={floatingStyles}
        data-globally-prevent-click-outside="true"
      >
        <OverlayContainer>
          <div {...stylex.props(styles.expandedFieldContainer)}>{children}</div>
        </OverlayContainer>
      </div>
    </FloatingPortal>
  );
};
