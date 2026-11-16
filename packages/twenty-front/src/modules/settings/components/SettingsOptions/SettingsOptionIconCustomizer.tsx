import * as stylex from '@stylexjs/stylex';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

type SettingsOptionIconCustomizerProps = {
  Icon: IconComponent;
  zoom?: number;
  rotate?: number;
};

export const SettingsOptionIconCustomizer = ({
  Icon,
  zoom = 1,
  rotate = -4,
}: SettingsOptionIconCustomizerProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.root, styles.transform(zoom, rotate))}>
      <Icon
        size={theme.icon.size.lg}
        color={theme.IllustrationIcon.color.gray}
        stroke={theme.icon.stroke.md}
      />
    </div>
  );
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'inline-flex',
    justifyContent: 'center',
  },
  transform: (zoom: number, rotate: number) => ({
    transform: `scale(${zoom}) rotate(${rotate}deg)`,
  }),
});
