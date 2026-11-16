import * as stylex from '@stylexjs/stylex';
import { Link } from 'react-router-dom';
import { type LinkChipProps } from './types/LinkChipProps';

import { LINK_CHIP_CLICK_OUTSIDE_ID } from '@/ui/navigation/link/constants/LinkChipClickOutsideId';
import { useMouseDownNavigation } from '@/ui/navigation/hooks/useMouseDownNavigation';
import { Chip } from 'twenty-ui/primitives/data-display';

const styles = stylex.create({
  linkContainer: {
    display: 'inline-flex',
    minWidth: 0,
    verticalAlign: 'middle',
  },
  chip: {
    minWidth: 0,
    textDecoration: 'none',
  },
});

export const LinkChip = ({
  to,
  target,
  onClick,
  onMouseDown,
  triggerEvent,
  ref,
  className,
  ...props
}: LinkChipProps) => {
  const { onClick: onClickHandler, onMouseDown: onMouseDownHandler } =
    useMouseDownNavigation({ to, onClick, triggerEvent });
  const chipProps = stylex.props(styles.chip);

  return (
    <span {...stylex.props(styles.linkContainer)}>
      <Chip
        clickable
        {...props}
        className={[chipProps.className, className].join(' ')}
        render={
          <Link
            to={to}
            ref={ref}
            onClick={(event) => {
              event.stopPropagation();
              const isKeyboardClick = event.detail === 0;

              if (isKeyboardClick && triggerEvent !== 'CLICK') {
                onMouseDownHandler(event);
              }

              onClickHandler(event);
            }}
            onMouseDown={(event) => {
              onMouseDown?.(event);
              if (!event.defaultPrevented) {
                onMouseDownHandler(event);
              }
            }}
            data-click-outside-id={LINK_CHIP_CLICK_OUTSIDE_ID}
            target={target}
            rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          />
        }
      />
    </span>
  );
};
