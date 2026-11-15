import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { color, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'row',
    gap: spacing['--t-spacing-2'],
  },
  containerDanger: {
    color: color['--t-color-red'],
  },
  textContainer: {},
});

type CustomSideMenuOptionsProps = {
  LeftIcon: IconComponent; // Any valid React node (e.g., a component)
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
      {...stylex.props(
        styles.container,
        Variant === 'danger' && styles.containerDanger,
      )}
    >
      <LeftIcon
        size={theme.icon.size.md}
        stroke={theme.icon.stroke.sm}
      ></LeftIcon>
      <div {...stylex.props(styles.textContainer)}>{text}</div>
    </div>
  );
};
