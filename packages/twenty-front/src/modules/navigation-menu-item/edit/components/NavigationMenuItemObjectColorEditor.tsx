import { objectColorsDraftState } from '@/layout-customization/states/objectColorsDraftState';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { objectMetadataItemsWithFieldsSelector } from '@/object-metadata/states/objectMetadataItemsWithFieldsSelector';
import { getObjectColorWithFallback } from '@/object-metadata/utils/getObjectColorWithFallback';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { ThemeColorPickerMenu } from '@/ui/input/components/ThemeColorPickerMenu';
import { Dropdown } from 'twenty-ui/components/navigation';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { NavigationDrawerItemEditingContext } from '@/ui/navigation/navigation-drawer/contexts/NavigationDrawerItemEditingContext';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  PermissionFlagType,
  type NavigationMenuItem,
} from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  iconButton: {
    background: 'transparent',
    borderWidth: '0',
    alignItems: 'center',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
  },
  popupScope: {
    display: 'contents',
  },
});

type NavigationMenuItemObjectColorEditorProps = {
  item: NavigationMenuItem;
  children: ReactNode;
};

export const NavigationMenuItemObjectColorEditor = ({
  item,
  children,
}: NavigationMenuItemObjectColorEditorProps) => {
  const { t } = useLingui();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const objectMetadataItemsWithFields = useAtomStateValue(
    objectMetadataItemsWithFieldsSelector,
  );
  const setObjectColorsDraft = useSetAtomState(objectColorsDraftState);
  const hasDataModelPermission = useHasPermissionFlag(
    PermissionFlagType.DATA_MODEL,
  );
  const dropdownId = `navigation-item-${item.id}-color`;
  const object = objectMetadataItems.find(
    (object) => object.id === item.targetObjectMetadataId,
  );
  const persistedObject = objectMetadataItemsWithFields.find(
    (object) => object.id === item.targetObjectMetadataId,
  );

  if (!isDefined(object) || object.isSystem || !hasDataModelPermission) {
    return children;
  }

  return (
    <NavigationDrawerItemEditingContext.Provider
      value={{
        label: undefined,
        isSelected: false,
        icon: (
          <DropdownRoot dropdownId={dropdownId} type="picker">
            <Dropdown.Trigger
              render={
                <button
                  type="button"
                  aria-label={t`Change object color`}
                  {...stylex.props(styles.iconButton)}
                >
                  <ObjectMetadataIcon objectMetadataItem={object} />
                </button>
              }
            />
            <DropdownContent side="right" align="start">
              <div
                data-click-outside-id={dropdownId}
                {...stylex.props(styles.popupScope)}
              >
                <ThemeColorPickerMenu
                  selectedColor={getObjectColorWithFallback(object)}
                  onSelectColor={(color) => {
                    setObjectColorsDraft((draft) => {
                      const { [object.id]: _previousColor, ...otherColors } =
                        draft;

                      if (
                        color === getObjectColorWithFallback(persistedObject)
                      ) {
                        return otherColors;
                      }

                      return { ...otherColors, [object.id]: color };
                    });
                  }}
                />
              </div>
            </DropdownContent>
          </DropdownRoot>
        ),
      }}
    >
      {children}
    </NavigationDrawerItemEditingContext.Provider>
  );
};
