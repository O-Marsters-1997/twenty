import { Link } from 'react-router-dom';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import {
  animationDuration,
  spacing,
  backgroundTransparent,
  borderRadius,
  fontColor,
  color,
} from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type WidgetCardHeaderActionLinkProps = {
  Icon: IconComponent;
  label: string;
  to: string;
};

export const WidgetCardHeaderActionLink = ({
  Icon,
  label,
  to,
}: WidgetCardHeaderActionLinkProps) => {
  const theme = useTheme();

  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      {...stylex.props(styles.link)}
    >
      <Icon size={theme.icon.size.sm} aria-hidden />
    </Link>
  );
};

const styles = stylex.create({
  link: {
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
      ':active': backgroundTransparent['--t-background-transparent-medium'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    height: spacing['--t-spacing-6'],
    justifyContent: 'center',
    minWidth: spacing['--t-spacing-6'],
    outlineColor: { default: null, ':focus-visible': color['--t-color-blue'] },
    outlineOffset: { default: null, ':focus-visible': 1 },
    outlineStyle: { default: null, ':focus-visible': 'solid' },
    outlineWidth: { default: null, ':focus-visible': 2 },
    padding: spacing['--t-spacing-1'],
    textDecoration: 'none',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'background',
    transitionTimingFunction: 'ease',
    width: spacing['--t-spacing-6'],
  },
});
