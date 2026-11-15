import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import * as stylex from '@stylexjs/stylex';
import { type SyntheticEvent, useCallback, useState } from 'react';

import { Popover } from '@ui/primitives/surfaces/Popover/Popover';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../styles/focus.stylex';
import {
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from '../../../theme/tokens.stylex';
import { overflowingListItemsMarker } from './OverflowingList.stylex';
import { OverflowingListItem } from './internal/OverflowingListItem';
import { useOverflowingListLayout } from './internal/useOverflowingListLayout';
import { useFocusedElementUnmountRef } from './internal/useFocusedElementUnmountRef';
import { type OverflowingListProps } from './types/OverflowingListProps';

const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();

const STOP_PROPAGATION_PROPS = {
  onClick: stopPropagation,
  onMouseDown: stopPropagation,
  onPointerDown: stopPropagation,
  onKeyDown: stopPropagation,
  onKeyUp: stopPropagation,
};

export const OverflowingList = ({
  children,
  showOverflowCount,
  maxInlineCount,
  overflowLabel = 'Show all items',
  className,
  xstyle,
  onMouseEnter,
  onMouseLeave,
  onFocusCapture,
  onBlurCapture,
  ref,
  ...props
}: WithXstyle<OverflowingListProps>) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedItemCountVisibility, setFocusedItemCountVisibility] =
    useState<boolean>();
  const isCountVisible =
    showOverflowCount ??
    focusedItemCountVisibility ??
    (isHovered || hasFocus || isOpen);
  const inlineItemCount =
    isDefined(maxInlineCount) && Number.isFinite(maxInlineCount)
      ? Math.min(children.length, Math.max(0, Math.floor(maxInlineCount)))
      : children.length;
  const isMeasurementEnabled =
    showOverflowCount ?? (isHovered || hasFocus || isOpen);
  const { containerRef, itemsRef, triggerRef, visibleItemCount, hasOverflow } =
    useOverflowingListLayout({
      itemCount: children.length,
      inlineItemCount,
      reserveCountSpace: isCountVisible,
      isMeasurementEnabled,
    });
  const resetFocusState = useCallback(() => {
    setHasFocus(false);
    setFocusedItemCountVisibility(undefined);
  }, []);
  const resetFocusWhenFocusedTriggerUnmounts =
    useFocusedElementUnmountRef(resetFocusState);
  const mergedRef = useMergedRefs(containerRef, ref);
  const mergedTriggerRef = useMergedRefs(
    triggerRef,
    resetFocusWhenFocusedTriggerUnmounts,
  );
  const displayedItemCount = isMeasurementEnabled
    ? visibleItemCount
    : inlineItemCount;
  const hiddenItemCount = children.length - visibleItemCount;
  const canExpand = hasOverflow && (isOpen || showOverflowCount !== false);

  if (isOpen && !canExpand) {
    setIsOpen(false);
  }

  return (
    <div
      {...props}
      ref={mergedRef}
      {...mergeStylexProps(stylex.props(styles.root, xstyle), className)}
      onMouseEnter={(event) => {
        setIsHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setIsHovered(false);
        onMouseLeave?.(event);
      }}
      onFocusCapture={(event) => {
        setHasFocus(true);

        if (itemsRef.current?.contains(event.target)) {
          setFocusedItemCountVisibility(
            (currentVisibility) => currentVisibility ?? isCountVisible,
          );
        }

        onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        setHasFocus(event.currentTarget.contains(event.relatedTarget));

        if (!itemsRef.current?.contains(event.relatedTarget)) {
          setFocusedItemCountVisibility(undefined);
        }

        onBlurCapture?.(event);
      }}
    >
      <div
        ref={itemsRef}
        {...stylex.props(overflowingListItemsMarker, styles.items)}
      >
        {children.slice(0, inlineItemCount).map((child, index) => (
          <OverflowingListItem
            key={child.key ?? index}
            isHidden={index >= displayedItemCount}
            isLastVisible={
              showOverflowCount !== false && index === displayedItemCount - 1
            }
            onFocusedItemUnmount={resetFocusState}
          >
            {child}
          </OverflowingListItem>
        ))}
      </div>
      {canExpand && (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger
            ref={mergedTriggerRef}
            type="button"
            className={
              stylex.props(
                focusStyles.ring,
                styles.trigger,
                isCountVisible && styles.triggerVisible,
              ).className
            }
            data-visible={isCountVisible || undefined}
            aria-label={`+${hiddenItemCount} ${overflowLabel}`}
            {...STOP_PROPAGATION_PROPS}
          >
            +{hiddenItemCount}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner
              anchor={containerRef}
              align="start"
              sideOffset={-9}
              alignOffset={-7}
            >
              <Popover.Popup
                aria-label={overflowLabel}
                className={stylex.props(styles.popup).className}
                data-overflowing-list-popup=""
                {...STOP_PROPAGATION_PROPS}
              >
                {children}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    inlineSize: '100%',
    justifyContent: 'space-between',
    minInlineSize: 0,
    position: 'relative',
  },
  items: {
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 1,
    gap: spacing['--t-spacing-1'],
    maxInlineSize: '100%',
    minInlineSize: 0,
    overflow: {
      default: 'hidden',
      ':is([data-measuring])': 'visible',
    },
    position: 'relative',
  },
  trigger: {
    appearance: 'none',
    backgroundColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderWidth: 0,
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    font: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    insetInlineEnd: 0,
    minInlineSize: 24,
    opacity: 0,
    padding: 0,
    pointerEvents: 'none',
    position: 'absolute',
  },
  triggerVisible: {
    opacity: 1,
    pointerEvents: 'auto',
    position: 'static',
  },
  popup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    inlineSize: 'max(220px, var(--anchor-width))',
    maxBlockSize: 'var(--available-height)',
    overflow: 'auto',
  },
});
