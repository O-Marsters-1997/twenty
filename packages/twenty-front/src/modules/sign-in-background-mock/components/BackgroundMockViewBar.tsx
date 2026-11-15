
import { TopBar } from '@/ui/layout/top-bar/components/TopBar';
import { TintedIconTile } from 'twenty-ui/components/data-display';
import { IconBuildingSkyscraper, IconChevronDown } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  viewPicker: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    height: '100%',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
  },
  viewPickerCount: {
    color: fontColor['--t-font-color-tertiary'],
  },
  rightAction: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-regular'],
    height: '100%',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
  },
});

export const BackgroundMockViewBar = () => {
  const theme = useTheme();

  return (
    <TopBar
      leftComponent={
        <div {...stylex.props(styles.viewPicker)}>
          <TintedIconTile
            icon={<IconBuildingSkyscraper size={theme.icon.size.md} />}
            color="blue"
          />
          <span>All Companies</span>
          <span {...stylex.props(styles.viewPickerCount)}>· 599</span>
          <IconChevronDown
            size={theme.icon.size.sm}
            stroke={theme.icon.stroke.sm}
          />
        </div>
      }
      rightComponent={
        <>
          <div {...stylex.props(styles.rightAction)}>Filter</div>
          <div {...stylex.props(styles.rightAction)}>Sort</div>
          <div {...stylex.props(styles.rightAction)}>Options</div>
        </>
      }
    />
  );
};
