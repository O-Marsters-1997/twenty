import * as stylex from '@stylexjs/stylex';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { borderRadius } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  checkContainer: {
    borderRadius: borderRadius['--t-border-radius-rounded'],
    borderStyle: 'solid',
    borderWidth: '2px',
    cornerShape: 'round',
    alignItems: 'center',
    boxSizing: 'content-box',
    display: 'flex',
    justifyContent: 'center',
    height: '36px',
    width: '36px',
  },
  checkContainerColor: (color: string) => ({
    borderColor: color,
    boxShadow: `-4px 4px 0 -2px ${color}`,
  }),
});

type OnboardingModalCircularIconProps = {
  Icon: IconComponent;
};

export const OnboardingModalCircularIcon = ({
  Icon,
}: OnboardingModalCircularIconProps) => {
  const theme = useTheme();
  const color = theme.background.invertedPrimary;

  return (
    <div
      {...stylex.props(
        styles.checkContainer,
        styles.checkContainerColor(color),
      )}
    >
      <Icon size={24} color={color} stroke={3} />
    </div>
  );
};
