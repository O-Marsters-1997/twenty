import * as stylex from '@stylexjs/stylex';
import { type MouseEventHandler, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { borderColor, color, fontColor } from 'twenty-ui/theme/tokens.stylex';

type SettingsTextLinkVariant = 'primary' | 'secondary';

type SettingsTextLinkCommonProps = {
  children: ReactNode;
  xstyle?: stylex.StyleXStyles;
  title?: string;
  variant?: SettingsTextLinkVariant;
};

type SettingsTextLinkProps =
  | (SettingsTextLinkCommonProps & {
      disabled?: boolean;
      onClick?: MouseEventHandler<HTMLButtonElement>;
      to?: undefined;
    })
  | (SettingsTextLinkCommonProps & {
      disabled?: never;
      onClick?: MouseEventHandler<HTMLAnchorElement>;
      to: LinkProps['to'];
    });

const styles = stylex.create({
  base: {
    font: 'inherit',
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    opacity: {
      default: null,
      ':disabled': 0.5,
    },
    textDecorationLine: 'underline',
    textOverflow: 'ellipsis',
    textUnderlineOffset: '2px',
    whiteSpace: 'nowrap',
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
  },
  primary: {
    color: {
      default: fontColor['--t-font-color-primary'],
      ':disabled': fontColor['--t-font-color-primary'],
      ':hover': color['--t-color-blue'],
    },
    textDecorationColor: {
      default: borderColor['--t-border-color-strong'],
      ':disabled': borderColor['--t-border-color-strong'],
      ':hover': color['--t-color-blue'],
    },
  },
  secondary: {
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
      ':hover': color['--t-color-blue'],
    },
    textDecorationColor: {
      default: fontColor['--t-font-color-tertiary'],
      ':disabled': fontColor['--t-font-color-tertiary'],
      ':hover': color['--t-color-blue'],
    },
  },
});

export const SettingsTextLink = ({
  children,
  xstyle,
  title,
  variant = 'primary',
  ...props
}: SettingsTextLinkProps) => {
  const textLinkProps = stylex.props(styles.base, styles[variant], xstyle);

  if (props.to !== undefined) {
    return (
      <Link
        {...textLinkProps}
        onClick={props.onClick}
        title={title}
        to={props.to}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      {...textLinkProps}
      disabled={props.disabled ?? false}
      onClick={props.onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
};
