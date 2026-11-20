import * as stylex from '@stylexjs/stylex';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { color, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  danger: {
    color: color['--t-color-red'],
  },
});

type CustomSideMenuOptionsProps = {
  LeftIcon: IconComponent;
  Variant: Variants;
  text: string;
};

type Variants = 'normal' | 'danger';

export const CustomSideMenuOptions = ({
  LeftIcon,
  Variant,
  text,
}: CustomSideMenuOptionsProps) => {
  const theme = useTheme();

  return (
    <div
      {...stylex.props(styles.container, Variant === 'danger' && styles.danger)}
    >
      <LeftIcon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
      <div>{text}</div>
    </div>
  );
};
