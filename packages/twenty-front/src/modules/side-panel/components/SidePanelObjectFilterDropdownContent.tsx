import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { sidePanelShowHiddenObjectsState } from '@/side-panel/states/sidePanelShowHiddenObjectsState';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { OBJECTS_WITH_CHANNEL_VISIBILITY_CONSTRAINTS } from 'twenty-shared/constants';
import { TintedIconTile } from 'twenty-ui/components/data-display';
import { Dropdown } from 'twenty-ui/components/navigation';
import { SettingsRow } from 'twenty-ui/components/settings';
import { IconCube } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  header: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

type SidePanelObjectFilterDropdownContentProps = {
  selectedObjectNameSingular: string | null;
  onSelectObject: (objectNameSingular: string | null) => void;
};

export const SidePanelObjectFilterDropdownContent = ({
  selectedObjectNameSingular,
  onSelectObject,
}: SidePanelObjectFilterDropdownContentProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const [filterSearch, setFilterSearch] = useState('');
  const [sidePanelShowHiddenObjects, setSidePanelShowHiddenObjects] =
    useAtomState(sidePanelShowHiddenObjectsState);
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();

  const searchFilter = filterSearch.toLowerCase();

  const displayedObjects = readableObjectMetadataItems.filter((item) => {
    if (
      OBJECTS_WITH_CHANNEL_VISIBILITY_CONSTRAINTS.includes(
        item.nameSingular as (typeof OBJECTS_WITH_CHANNEL_VISIBILITY_CONSTRAINTS)[number],
      )
    ) {
      return false;
    }

    if (!sidePanelShowHiddenObjects && !item.isSearchable) {
      return false;
    }

    return item.labelPlural.toLowerCase().includes(searchFilter);
  });

  const allObjectsLabel = t`All objects`;

  const isAllObjectsOptionMatchingSearch = allObjectsLabel
    .toLowerCase()
    .includes(searchFilter);

  return (
    <>
      <div {...stylex.props(styles.header)}>{t`Object`}</div>
      <Dropdown.Search
        value={filterSearch}
        placeholder={t`Search`}
        aria-label={t`Search`}
        onValueChange={setFilterSearch}
      />
      <Dropdown.Separator />
      <Dropdown.Section scrollable>
        {isAllObjectsOptionMatchingSearch && (
          <Dropdown.OptionItem
            onSelect={() => onSelectObject(null)}
            selected={selectedObjectNameSingular === null}
            startIcon={
              <TintedIconTile icon={<IconCube size={theme.icon.size.md} />} />
            }
          >
            {allObjectsLabel}
          </Dropdown.OptionItem>
        )}
        {displayedObjects.map((objectMetadataItem) => (
          <Dropdown.OptionItem
            key={objectMetadataItem.id}
            onSelect={() => onSelectObject(objectMetadataItem.nameSingular)}
            selected={
              selectedObjectNameSingular === objectMetadataItem.nameSingular
            }
            startIcon={
              <ObjectMetadataIcon objectMetadataItem={objectMetadataItem} />
            }
          >
            {objectMetadataItem.labelPlural}
          </Dropdown.OptionItem>
        ))}
      </Dropdown.Section>
      <Dropdown.Separator />
      <Dropdown.Section>
        <SettingsRow
          startElement={<IconCube />}
          onCheckedChange={() =>
            setSidePanelShowHiddenObjects(!sidePanelShowHiddenObjects)
          }
          checked={sidePanelShowHiddenObjects}
        >{t`Show hidden objects`}</SettingsRow>
      </Dropdown.Section>
    </>
  );
};
