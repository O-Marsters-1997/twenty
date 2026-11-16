import * as stylex from '@stylexjs/stylex';
import { type MouseEvent } from 'react';
import { type MenuItemSuggestionProps } from './types/MenuItemSuggestionProps';

import { MenuItemLeftContent } from '@ui/components/navigation/MenuItem/parts/MenuItemLeftContent';
import { StyledMenuItemLeftContent } from '@ui/components/navigation/MenuItem/parts/StyledMenuItemBase';
import { handleClickableElementKeyDown } from '@ui/primitives/accessibility/utils/handleClickableElementKeyDown';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from '../../../theme/tokens.stylex';

export const MenuItemSuggestion = ({
  LeftIcon,
  withIconContainer = false,
  text,
  contextualText = undefined,
  contextualTextPosition = 'left',
  className,
  xstyle,
  selected,
  onClick,
}: MenuItemSuggestionProps) => {
  const handleMenuItemClick = (event: MouseEvent<HTMLLIElement>) => {
    if (!onClick) return;
    event.preventDefault();
    event.stopPropagation();

    onClick?.(event);
  };

  return (
    <li
      {...mergeStylexProps(
        stylex.props(styles.root, selected && styles.selected, xstyle),
        className,
      )}
      data-selected={selected || undefined}
      role={isDefined(onClick) ? 'button' : undefined}
      tabIndex={isDefined(onClick) ? 0 : undefined}
      onClick={handleMenuItemClick}
      onKeyDown={handleClickableElementKeyDown}
    >
      <StyledMenuItemLeftContent>
        <MenuItemLeftContent
          LeftIcon={LeftIcon ?? undefined}
          text={text}
          contextualText={contextualText}
          contextualTextPosition={contextualTextPosition}
          withIconContainer={withIconContainer}
        />
      </StyledMenuItemLeftContent>
    </li>
  );
};

const horizontalPadding = spacing['--t-spacing-1'];
const verticalPadding = spacing['--t-spacing-2'];

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderEndEndRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderEndStartRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderStartEndRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    borderStartStartRadius: `calc(${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']})`,
    blockSize: `calc(32px - 2 * ${verticalPadding})`,
    boxSizing: 'content-box',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-2'],
    inlineSize: `calc(100% - 2 * ${horizontalPadding})`,
    justifyContent: 'space-between',
    paddingBlock: verticalPadding,
    paddingInline: horizontalPadding,
    position: 'relative',
    transition: 'background 0.1s ease',
    userSelect: 'none',
  },
  selected: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-medium'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
  },
});
