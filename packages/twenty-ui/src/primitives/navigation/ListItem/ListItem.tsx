import { useRender } from '@base-ui/react/use-render';
import { isString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';

import { IconCheck, IconChevronRight } from '@ui/icon';
import { Shortcut } from '@ui/primitives/typography/Shortcut/Shortcut';
import { OverflowingTextWithTooltip } from '@ui/primitives/typography/OverflowingTextWithTooltip/OverflowingTextWithTooltip';
import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../styles/focus.stylex';
import { ListItemCheckboxIndicator } from './internal/ListItemCheckboxIndicator';
import { listItemMarker } from './ListItem.stylex';
import { listItemStyles as styles } from './ListItemStyles.stylex';
import { type ListItemProps } from './types/ListItemProps';

import './ListItem.css';

export const ListItem = ({
  color = 'neutral',
  selected = false,
  focused = false,
  disabled = false,
  indicator = 'none',
  startIcon,
  endIcon,
  description,
  descriptionPlacement = 'inline',
  actions,
  actionsVisibility = 'hover',
  shortcut,
  shortcutJoinLabel,
  hasSubmenu = false,
  className,
  xstyle,
  children,
  render,
  ref,
  ...props
}: WithXstyle<ListItemProps>) => {
  const hasDescription = isRenderableSlot(description);

  return useRender({
    render,
    ref,
    state: { color, indicator, selected, highlighted: focused, disabled },
    props: {
      ...props,
      'data-actions-visibility': actionsVisibility,
      ...mergeStylexProps(
        stylex.props(listItemMarker, focusStyles.ring, styles.root, xstyle),
        className,
      ),
      children: (
        <>
          {indicator === 'checkbox' && (
            <ListItemCheckboxIndicator checked={selected} disabled={disabled} />
          )}
          {isRenderableSlot(startIcon) && (
            <span
              {...mergeStylexProps(
                stylex.props(styles.icon),
                'tw-list-item-icon',
              )}
            >
              {startIcon}
            </span>
          )}
          <span {...stylex.props(styles.label)}>
            <span {...stylex.props(styles.text)}>
              {isString(children) ? (
                <OverflowingTextWithTooltip text={children} />
              ) : (
                children
              )}
            </span>
            {hasDescription && descriptionPlacement === 'inline' && (
              <span
                {...stylex.props(styles.description, styles.inlineDescription)}
              >
                {description}
              </span>
            )}
          </span>
          {hasDescription && descriptionPlacement === 'end' && (
            <span {...stylex.props(styles.description, styles.endDescription)}>
              {description}
            </span>
          )}
          {isRenderableSlot(actions) && (
            <span {...stylex.props(styles.actions)}>{actions}</span>
          )}
          {isDefined(shortcut) && (
            <Shortcut
              className={stylex.props(styles.hotkeys).className}
              shortcut={shortcut}
              sequenceJoinLabel={shortcutJoinLabel}
            />
          )}
          {isRenderableSlot(endIcon) && (
            <span
              {...mergeStylexProps(
                stylex.props(styles.icon),
                'tw-list-item-icon',
              )}
            >
              {endIcon}
            </span>
          )}
          {indicator === 'check' && selected && (
            <IconCheck
              className={stylex.props(styles.checkIndicator).className}
              aria-hidden
            />
          )}
          {hasSubmenu && (
            <IconChevronRight
              className={stylex.props(styles.submenuIcon).className}
              aria-hidden
            />
          )}
        </>
      ),
    },
  });
};
