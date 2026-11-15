import { type ReactNode, useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { ClickOutsideListenerContext } from '@/ui/utilities/pointer-event/contexts/ClickOutsideListenerContext';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  clickOutsideListenerExclusion: {
    display: 'contents',
  },
});

type DropdownClickOutsideListenerExclusionProps = {
  children: ReactNode;
};

export const DropdownClickOutsideListenerExclusion = ({
  children,
}: DropdownClickOutsideListenerExclusionProps) => {
  const { excludedClickOutsideId } = useContext(ClickOutsideListenerContext);

  if (!isDefined(excludedClickOutsideId)) {
    return children;
  }

  return (
    <div
      data-click-outside-id={excludedClickOutsideId}
      {...stylex.props(styles.clickOutsideListenerExclusion)}
    >
      {children}
    </div>
  );
};
