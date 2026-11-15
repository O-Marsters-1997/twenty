import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import * as stylex from '@stylexjs/stylex';
import { type Ref, forwardRef } from 'react';

const styles = stylex.create({
  content: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  width: (widthInPixels: number) => ({
    width: `${widthInPixels}px`,
  }),
});

export const LegacyDropdownContent = forwardRef(
  (
    {
      children,
      widthInPixels = GenericDropdownContentWidth.Medium,
      selectDisabled = false,
    }: React.PropsWithChildren<{
      widthInPixels?: number;
      selectDisabled?: boolean;
    }>,
    ref: Ref<HTMLDivElement>,
  ) => {
    return (
      <div
        data-select-disable={selectDisabled}
        ref={ref}
        {...stylex.props(styles.content, styles.width(widthInPixels))}
      >
        {children}
      </div>
    );
  },
);
