import * as stylex from '@stylexjs/stylex';
import { type ReactElement } from 'react';

import { overflowingListItemsMarker } from '../OverflowingList.stylex';
import { useFocusedElementUnmountRef } from './useFocusedElementUnmountRef';

type OverflowingListItemProps = {
  children: ReactElement;
  isHidden: boolean;
  isLastVisible: boolean;
  onFocusedItemUnmount: () => void;
};

export const OverflowingListItem = ({
  children,
  isHidden,
  isLastVisible,
  onFocusedItemUnmount,
}: OverflowingListItemProps) => {
  const resetFocusWhenFocusedItemUnmounts =
    useFocusedElementUnmountRef(onFocusedItemUnmount);

  return (
    <div
      ref={resetFocusWhenFocusedItemUnmounts}
      {...stylex.props(
        styles.item,
        isHidden && styles.hidden,
        isLastVisible && styles.lastVisible,
      )}
      data-hidden={isHidden || undefined}
      data-last-visible={isLastVisible || undefined}
      aria-hidden={isHidden || undefined}
      inert={isHidden}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  item: {
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    inlineSize: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-measuring])',
        overflowingListItemsMarker,
      )]: 'max-content',
    },
    maxInlineSize: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-measuring])',
        overflowingListItemsMarker,
      )]: 'none',
    },
    minInlineSize: 0,
    overflow: 'hidden',
    position: {
      default: null,
      [stylex.when.ancestor(
        ':is([data-measuring])',
        overflowingListItemsMarker,
      )]: 'static',
    },
  },
  hidden: {
    inlineSize: 'max-content',
    position: {
      default: 'absolute',
      [stylex.when.ancestor(
        ':is([data-measuring])',
        overflowingListItemsMarker,
      )]: 'static',
    },
    visibility: 'hidden',
  },
  lastVisible: {
    flexShrink: {
      default: 1,
      [stylex.when.ancestor(
        ':is([data-measuring])',
        overflowingListItemsMarker,
      )]: 0,
    },
  },
});
