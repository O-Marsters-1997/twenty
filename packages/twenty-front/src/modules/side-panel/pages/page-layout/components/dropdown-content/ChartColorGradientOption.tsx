import { CHART_SETTINGS_PALETTE_COLOR_GROUP_COUNT } from '@/side-panel/pages/page-layout/constants/ChartSettingsPaletteColorGroupCount';
import { createGraphColorRegistry } from '@/page-layout/widgets/graph/utils/createGraphColorRegistry';
import { generateGroupColor } from '@/page-layout/widgets/graph/utils/generateGroupColor';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { ColorSample } from 'twenty-ui/primitives/data-display';
import { ListItemButton } from 'twenty-ui/components/navigation';
import { useTheme, type ThemeColor } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type ChartColorGradientOptionProps = {
  colorOption: {
    id: string;
    name: string;
    colorName: ThemeColor | 'auto';
  };
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

export const ChartColorGradientOption = ({
  colorOption,
  selectedItemId,
  currentColor,
  onSelectColor,
}: ChartColorGradientOptionProps) => {
  const colorName = colorOption.colorName as ThemeColor;

  const theme = useTheme();
  const colorRegistry = createGraphColorRegistry(theme.color);

  const colorSamples = (
    <div {...stylex.props(styles.colorSamplesContainer)}>
      {Array.from({ length: CHART_SETTINGS_PALETTE_COLOR_GROUP_COUNT }).map(
        (_, index) => {
          const colorScheme = colorRegistry[colorName];
          const reversedIndex =
            CHART_SETTINGS_PALETTE_COLOR_GROUP_COUNT - 1 - index;
          const groupColor = generateGroupColor({
            colorScheme,
            groupIndex: reversedIndex,
            totalGroups: CHART_SETTINGS_PALETTE_COLOR_GROUP_COUNT,
          });
          return (
            <ColorSample key={index} colorName={colorName} color={groupColor} />
          );
        },
      )}
    </div>
  );

  return (
    <SelectableListItem
      key={colorOption.id}
      itemId={colorOption.id}
      onEnter={() => {
        onSelectColor(colorOption.colorName);
      }}
    >
      <ListItemButton
        focused={
          selectedItemId === colorOption.id || currentColor === colorOption.id
        }
        onClick={() => {
          onSelectColor(colorOption.colorName);
        }}
        role="option"
        aria-selected={false}
        selected={false}
        indicator="check"
        description={colorSamples}
        descriptionPlacement={'end'}
      >
        {colorOption.name}
      </ListItemButton>
    </SelectableListItem>
  );
};
