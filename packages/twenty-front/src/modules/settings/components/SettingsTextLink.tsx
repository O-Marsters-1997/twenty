import * as stylex from '@stylexjs/stylex';
import { type MouseEventHandler, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import {
  borderColor,
  color,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

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
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    font: 'inherit',
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    opacity: {
      default: null,
      ':disabled': 0.5,
    },
    overflow: 'hidden',
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    textDecorationLine: 'underline',
    textOverflow: 'ellipsis',
    textUnderlineOffset: '2px',
    whiteSpace: 'nowrap',
  },
  primary: {
    color: {
      default: fontColor['--t-font-color-primary'],
      ':hover': color['--t-color-blue'],
      ':disabled': fontColor['--t-font-color-primary'],
    },
    textDecorationColor: {
      default: borderColor['--t-border-color-strong'],
      ':hover': color['--t-color-blue'],
      ':disabled': borderColor['--t-border-color-strong'],
    },
  },
  secondary: {
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': color['--t-color-blue'],
      ':disabled': fontColor['--t-font-color-tertiary'],
    },
    textDecorationColor: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': color['--t-color-blue'],
      ':disabled': fontColor['--t-font-color-tertiary'],
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
