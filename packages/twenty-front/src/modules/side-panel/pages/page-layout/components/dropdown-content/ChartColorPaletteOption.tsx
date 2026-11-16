import { CHART_SETTINGS_PALETTE_COLOR_GROUP_COUNT } from '@/side-panel/pages/page-layout/constants/ChartSettingsPaletteColorGroupCount';
import { createGraphColorRegistry } from '@/page-layout/widgets/graph/utils/createGraphColorRegistry';
import { getColorSchemeByIndex } from '@/page-layout/widgets/graph/utils/getColorSchemeByIndex';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { t } from '@lingui/core/macro';
import { ColorSample } from 'twenty-ui/primitives/data-display';
import { ListItemButton } from 'twenty-ui/components/navigation';
import { getMainColorNameFromPaletteColorName } from 'twenty-ui/utilities';
import { useTheme, type ThemeColor } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type ChartColorPaletteOptionProps = {
  selectedItemId: string | null;
  currentColor: string | null | undefined;
  onSelectColor: (colorName: ThemeColor | 'auto') => void;
};

const styles = stylex.create({
  colorSamplesContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-0_5'],
  },
});

export const ChartColorPaletteOption = ({
  selectedItemId,
  currentColor,
  onSelectColor,
}: ChartColorPaletteOptionProps) => {
  const theme = useTheme();
  const colorRegistry = createGraphColorRegistry(theme.color);

  const paletteColors = Array.from(
    { length: CHART_SETTINGS_PALETTE_COLOR_GROUP_COUNT },
    (_, index) => {
      const colorScheme = getColorSchemeByIndex(colorRegistry, index);

      return {
        colorName: colorScheme.name,
        color: colorScheme.solid,
      };
    },
  );

  const colorSamples = (
    <div {...stylex.props(styles.colorSamplesContainer)}>
      {paletteColors.map((paletteColor) => (
        <ColorSample
          key={paletteColor.colorName}
          colorName={getMainColorNameFromPaletteColorName(
            paletteColor.colorName,
          )}
          color={paletteColor.color}
        />
      ))}
    </div>
  );

  return (
    <SelectableListItem
      key={'auto'}
      itemId={'auto'}
      onEnter={() => {
        onSelectColor('auto');
      }}
    >
      <ListItemButton
        focused={selectedItemId === 'auto' || currentColor === 'auto'}
        onClick={() => {
          onSelectColor('auto');
        }}
        role="option"
        aria-selected={false}
        selected={false}
        indicator="check"
        description={colorSamples}
        descriptionPlacement={'end'}
      >{t`Default palette`}</ListItemButton>
    </SelectableListItem>
  );
};
