import { type ReactNode, useEffect, useRef } from 'react';

import { SelectableListItemHotkeyEffect } from '@/ui/layout/selectable-list/components/SelectableListItemHotkeyEffect';
import { isSelectedItemIdComponentFamilyState } from '@/ui/layout/selectable-list/states/isSelectedItemIdComponentFamilyState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
});

export type SelectableListItemProps = {
  itemId: string;
  children: ReactNode;
  onEnter?: () => void;
  className?: string;
};

export const SelectableListItem = ({
  itemId,
  children,
  onEnter,
  className,
}: SelectableListItemProps) => {
  const isSelectedItemId = useAtomComponentFamilyStateValue(
    isSelectedItemIdComponentFamilyState,
    itemId,
  );

  const listItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSelectedItemId || !listItemRef.current) {
      return;
    }

    listItemRef.current.scrollIntoView?.({
      behavior: 'auto',
      block: 'nearest',
    });
  }, [isSelectedItemId]);

  const containerProps = stylex.props(styles.container);

  return (
    <>
      {isSelectedItemId && isDefined(onEnter) && (
        <SelectableListItemHotkeyEffect itemId={itemId} onEnter={onEnter} />
      )}
      <div
        ref={listItemRef}
        {...containerProps}
        className={[containerProps.className, className].join(' ')}
      >
        {children}
      </div>
    </>
  );
};
