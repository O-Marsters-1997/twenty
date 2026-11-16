import { isNonEmptyString } from '@sniptt/guards';
import { type MouseEvent } from 'react';

import { getSafeUrl } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  link: {
    alignItems: 'center',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
      ':active': backgroundTransparent['--t-background-transparent-medium'],
    },
    borderColor: borderColor['--t-border-color-strong'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'content-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'inline-flex',
    flexShrink: 0,
    gap: spacing['--t-spacing-1'],
    height: '10px',
    justifyContent: 'center',
    maxWidth: `calc(100% - 2 * ${spacing['--t-spacing-2']} - 2px)`,
    overflow: 'hidden',
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-2'],
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  colorSecondary: {
    color: fontColor['--t-font-color-secondary'],
  },
  label: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

type RoundedLinkProps = {
  href: string;
  label?: string;
  color?: 'primary' | 'secondary';
  dir?: 'ltr' | 'rtl' | 'auto';
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  xstyle?: stylex.StyleXStyles;
};

export const RoundedLink = ({
  label,
  href,
  color = 'primary',
  dir = 'auto',
  onClick,
  xstyle,
}: RoundedLinkProps) => {
  if (!isNonEmptyString(label)) {
    return <></>;
  }

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onClick?.(event);
  };

  return (
    <a
      href={getSafeUrl(href)}
      target="_blank"
      rel="noreferrer"
      dir={dir}
      onClick={handleClick}
      data-color={color}
      {...stylex.props(
        styles.link,
        color === 'secondary' && styles.colorSecondary,
        xstyle,
      )}
    >
      <span {...stylex.props(styles.label)}>{label}</span>
    </a>
  );
};
