import * as stylex from '@stylexjs/stylex';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { borderRadius } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  checkContainer: {
    alignItems: 'center',
    borderRadius: borderRadius['--t-border-radius-rounded'],
    borderStyle: 'solid',
    borderWidth: '2px',
    boxSizing: 'content-box',
    cornerShape: 'round',
    display: 'flex',
    height: '36px',
    justifyContent: 'center',
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
