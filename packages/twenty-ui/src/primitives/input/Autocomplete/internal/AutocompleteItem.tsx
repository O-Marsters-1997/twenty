import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete';
import * as stylex from '@stylexjs/stylex';

import { listItemMarker } from '@ui/primitives/navigation/ListItem/ListItem.stylex';
import { listItemStyles } from '@ui/primitives/navigation/ListItem/ListItemStyles.stylex';
import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { type AutocompleteItemProps } from '../types/AutocompleteItemProps';

export const AutocompleteItem = ({
  className,
  xstyle,
  children,
  startIcon,
  endIcon,
  description,
  descriptionPlacement = 'inline',
  ...props
}: WithXstyle<AutocompleteItemProps>) => (
  <AutocompletePrimitive.Item
    {...props}
    {...mergeStylexProps(
      stylex.props(
        listItemMarker,
        focusStyles.ring,
        listItemStyles.root,
        xstyle,
      ),
      className,
    )}
    data-color="neutral"
  >
    {isRenderableSlot(startIcon) && (
      <div
        {...mergeStylexProps(
          stylex.props(listItemStyles.icon),
          'tw-list-item-icon',
        )}
        aria-hidden
      >
        {startIcon}
      </div>
    )}
    <div {...stylex.props(listItemStyles.label)}>
      <div {...stylex.props(listItemStyles.text)}>{children}</div>
      {isRenderableSlot(description) && descriptionPlacement === 'inline' && (
        <div
          {...stylex.props(
            listItemStyles.description,
            listItemStyles.inlineDescription,
          )}
        >
          {description}
        </div>
      )}
    </div>
    {isRenderableSlot(description) && descriptionPlacement === 'end' && (
      <div
        {...stylex.props(
          listItemStyles.description,
          listItemStyles.endDescription,
        )}
      >
        {description}
      </div>
    )}
    {isRenderableSlot(endIcon) && (
      <div
        {...mergeStylexProps(
          stylex.props(listItemStyles.icon),
          'tw-list-item-icon',
        )}
        aria-hidden
      >
        {endIcon}
      </div>
    )}
  </AutocompletePrimitive.Item>
);
