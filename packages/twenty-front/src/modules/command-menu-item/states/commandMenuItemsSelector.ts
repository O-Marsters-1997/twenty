import { metadataStoreState } from '@/metadata-store/states/metadataStoreState';
import { type FlatCommandMenuItem } from '@/metadata-store/types/FlatCommandMenuItem';
import { createAtomSelector } from '@/ui/utilities/state/jotai/utils/createAtomSelector';
import { type CommandMenuItemFieldsFragment } from '~/generated-metadata/graphql';

export const commandMenuItemsSelector = createAtomSelector<
  CommandMenuItemFieldsFragment[]
>({
  key: 'commandMenuItemsSelector',
  get: ({ get }) => {
    const commandMenuItems = get(metadataStoreState, 'commandMenuItems')
      .current as FlatCommandMenuItem[];
    return commandMenuItems.filter(
      (item) => item.isActive,
    ) as CommandMenuItemFieldsFragment[];
  },
});
