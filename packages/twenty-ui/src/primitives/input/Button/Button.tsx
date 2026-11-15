import { Button as ButtonPrimitive } from '@base-ui/react/button';
import * as stylex from '@stylexjs/stylex';
import { useContext } from 'react';

import { Loader } from '@ui/primitives/feedback/Loader/Loader';
import { Shortcut } from '@ui/primitives/typography/Shortcut/Shortcut';
import { ButtonGroupContext } from '@ui/primitives/input/ButtonGroup/internal/ButtonGroupContext';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../styles/focus.stylex';
import { media } from '../../../theme/constants.stylex';
import {
  accent,
  background,
  backgroundTransparent,
  blur,
  borderColor,
  boxShadow,
  color,
  font,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';
import './Button.css';
import { buttonMarker } from './Button.stylex';
import { type ButtonProps } from './types/ButtonProps';

export const Button = ({
  variant,
  color: colorProp,
  size,
  fullWidth = false,
  loading = false,
  loadingPosition = 'center',
  elevated = false,
  startIcon,
  endIcon,
  shortcut,
  shortcutJoinLabel,
  disabled = false,
  href,
  render,
  nativeButton,
  role,
  className,
  xstyle,
  children,
  ...props
}: ButtonProps) => {
  const buttonGroup = useContext(ButtonGroupContext);
  const resolvedVariant = variant ?? buttonGroup?.variant ?? 'outline';
  const resolvedColor = colorProp ?? buttonGroup?.color ?? 'neutral';
  const resolvedSize = size ?? buttonGroup?.size ?? 'md';
  const isAutomaticLink =
    isDefined(href) && !isDefined(render) && nativeButton !== true;
  const linkProps = isDefined(href) ? { href } : undefined;
  const resolvedRole = role ?? (isAutomaticLink ? 'link' : undefined);
  const roleProps = isDefined(resolvedRole)
    ? { role: resolvedRole }
    : undefined;
  const isCenterLoading = loading && loadingPosition === 'center';
  const resolvedStartIcon =
    loading && loadingPosition === 'start' ? <Loader /> : startIcon;
  const resolvedEndIcon =
    loading && loadingPosition === 'end' ? <Loader /> : endIcon;
  const isAttached = buttonGroup?.attached === true;
  const isLink = resolvedVariant === 'link';

  return (
    <ButtonPrimitive
      {...props}
      {...linkProps}
      {...mergeStylexProps(
        stylex.props(
          buttonMarker,
          focusStyles.ring,
          styles.root,
          resolvedSize === 'sm' && styles.sizeSm,
          variantStyles[resolvedVariant],
          colorStyles[resolvedColor],
          resolvedVariant === 'solid' && solidColorStyles[resolvedColor],
          resolvedVariant === 'outline' && outlineColorStyles[resolvedColor],
          resolvedVariant === 'soft' && softColorStyles[resolvedColor],
          isLink && styles.link,
          isLink && resolvedColor === 'neutral' && styles.linkNeutral,
          elevated && styles.elevated,
          elevated &&
            resolvedVariant === 'outline' &&
            resolvedColor === 'neutral' &&
            styles.elevatedNeutralOutline,
          fullWidth && styles.fullWidth,
          isAttached && styles.attached,
          isDefined(buttonGroup) && styles.grouped,
          (disabled || loading) && styles.disabled,
          loading && styles.loading,
          xstyle,
        ),
        className,
      )}
      data-variant={resolvedVariant}
      data-color={resolvedColor}
      data-size={resolvedSize}
      data-full-width={fullWidth || undefined}
      data-loading={loading || undefined}
      data-elevated={elevated || undefined}
      aria-busy={loading ? 'true' : props['aria-busy']}
      disabled={disabled || loading}
      {...roleProps}
      nativeButton={nativeButton ?? !isAutomaticLink}
      render={
        render ?? (isAutomaticLink ? <a href={href}>{children}</a> : undefined)
      }
    >
      <span {...stylex.props(styles.content, isCenterLoading && styles.hidden)}>
        {isDefined(resolvedStartIcon) && (
          <span
            {...mergeStylexProps(stylex.props(styles.icon), 'tw-button-icon')}
            aria-hidden
          >
            {resolvedStartIcon}
          </span>
        )}
        {isDefined(children) && (
          <span {...stylex.props(styles.label)}>{children}</span>
        )}
        {isDefined(resolvedEndIcon) && (
          <span
            {...mergeStylexProps(stylex.props(styles.icon), 'tw-button-icon')}
            aria-hidden
          >
            {resolvedEndIcon}
          </span>
        )}
        {isDefined(shortcut) && (
          <Shortcut
            shortcut={shortcut}
            sequenceJoinLabel={shortcutJoinLabel}
            variant="button"
            visibility="desktop"
            aria-hidden
          />
        )}
      </span>
      {isCenterLoading && (
        <span {...stylex.props(styles.loader)} aria-hidden>
          <Loader />
        </span>
      )}
    </ButtonPrimitive>
  );
};

const hoverable = ':hover:not(:is([data-disabled]))';
const pressed = ':active:not(:is([data-disabled]))';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: {
      default: 'var(--tw-button-background)',
      ':is([aria-pressed="true"])': 'var(--tw-button-active)',
      [pressed]: 'var(--tw-button-active)',
      [hoverable]: {
        default: null,
        [media.hoverCapable]: {
          default: 'var(--tw-button-hover)',
          ':active': 'var(--tw-button-active)',
        },
      },
    },
    blockSize: `var(--tw-button-size, ${spacing['--t-spacing-8']})`,
    borderColor: 'var(--tw-button-border)',
    borderStyle: 'solid',
    borderWidth: 1,
    borderStartStartRadius: 'var(--tw-button-radius)',
    borderStartEndRadius: 'var(--tw-button-radius)',
    borderEndStartRadius: 'var(--tw-button-radius)',
    borderEndEndRadius: 'var(--tw-button-radius)',
    boxSizing: 'border-box',
    color: 'var(--tw-button-color)',
    cursor: 'pointer',
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: `var(--tw-button-font-weight, ${fontWeight['--t-font-weight-medium']})`,
    justifyContent: 'center',
    maxInlineSize: '100%',
    minInlineSize: 0,
    paddingBlock: 0,
    paddingInline: `var(--tw-button-padding-inline, ${spacing['--t-spacing-2']})`,
    position: 'relative',
    textDecoration: 'none',
    transition: {
      default: 'background 0.1s ease',
      [media.reducedMotion]: 'none',
    },
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  sizeSm: { blockSize: `var(--tw-button-size, ${spacing['--t-spacing-6']})` },
  fullWidth: { inlineSize: '100%' },
  disabled: { cursor: 'not-allowed', opacity: 0.5 },
  loading: { cursor: 'progress' },
  grouped: { zIndex: { default: null, ':focus-within': 1 } },
  attached: {
    borderStartStartRadius: {
      default: 'var(--tw-button-radius)',
      [stylex.when.siblingBefore(':is(*)', buttonMarker)]: 0,
    },
    borderEndStartRadius: {
      default: 'var(--tw-button-radius)',
      [stylex.when.siblingBefore(':is(*)', buttonMarker)]: 0,
    },
    borderStartEndRadius: {
      default: 'var(--tw-button-radius)',
      [stylex.when.siblingAfter(':is(*)', buttonMarker)]: 0,
    },
    borderEndEndRadius: {
      default: 'var(--tw-button-radius)',
      [stylex.when.siblingAfter(':is(*)', buttonMarker)]: 0,
    },
    marginInlineStart: {
      default: null,
      [stylex.when.siblingBefore(':is(*)', buttonMarker)]: -1,
    },
  },
  elevated: {
    backdropFilter: blur['--t-blur-medium'],
    boxShadow: boxShadow['--t-box-shadow-light'],
  },
  elevatedNeutralOutline: {
    '--tw-button-active':
      backgroundTransparent['--t-background-transparent-medium'],
    '--tw-button-background': background['--t-background-primary'],
    '--tw-button-border': borderColor['--t-border-color-strong'],
    '--tw-button-color': fontColor['--t-font-color-tertiary'],
    '--tw-button-hover':
      backgroundTransparent['--t-background-transparent-lighter'],
  },
  solid: {
    '--tw-button-active': background['--t-background-primary-inverted-hover'],
    '--tw-button-background': background['--t-background-primary-inverted'],
    '--tw-button-border':
      backgroundTransparent['--t-background-transparent-strong'],
    '--tw-button-color': fontColor['--t-font-color-inverted'],
    '--tw-button-hover': background['--t-background-primary-inverted-hover'],
  },
  ghost: {
    '--tw-button-active':
      backgroundTransparent['--t-background-transparent-medium'],
    '--tw-button-background': 'transparent',
    '--tw-button-border': 'transparent',
    '--tw-button-hover':
      backgroundTransparent['--t-background-transparent-light'],
  },
  soft: {
    '--tw-button-active':
      backgroundTransparent['--t-background-transparent-strong'],
    '--tw-button-background':
      backgroundTransparent['--t-background-transparent-light'],
    '--tw-button-border': 'transparent',
    '--tw-button-hover':
      backgroundTransparent['--t-background-transparent-medium'],
  },
  link: {
    '--tw-button-active': 'transparent',
    '--tw-button-background': 'transparent',
    '--tw-button-border': 'transparent',
    '--tw-button-hover': 'transparent',
    blockSize: 'var(--tw-button-size, auto)',
    borderWidth: 0,
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: 'inherit',
    paddingInline: `var(--tw-button-padding-inline, ${spacing['--t-spacing-1']})`,
  },
  linkNeutral: {
    '--tw-button-color': fontColor['--t-font-color-light'],
    color: {
      default: 'var(--tw-button-color)',
      [hoverable]: {
        default: null,
        [media.hoverCapable]: fontColor['--t-font-color-tertiary'],
      },
    },
  },
  accent: {
    '--tw-button-active': accent['--t-accent-secondary'],
    '--tw-button-color': color['--t-color-blue'],
    '--tw-button-hover': accent['--t-accent-tertiary'],
  },
  accentSolid: {
    '--tw-button-active': color['--t-color-blue12'],
    '--tw-button-background': color['--t-color-blue'],
    '--tw-button-border':
      backgroundTransparent['--t-background-transparent-light'],
    '--tw-button-color': 'color(display-p3 1 1 1)',
    '--tw-button-hover': color['--t-color-blue10'],
  },
  accentOutline: {
    '--tw-button-background': 'transparent',
    '--tw-button-border': accent['--t-accent-primary'],
  },
  accentSoft: {
    '--tw-button-background': accent['--t-accent-tertiary'],
    '--tw-button-hover': accent['--t-accent-secondary'],
  },
  danger: {
    '--tw-button-active': color['--t-color-red3'],
    '--tw-button-color': color['--t-color-red11'],
    '--tw-button-hover': background['--t-background-danger'],
  },
  dangerSolid: {
    '--tw-button-active': color['--t-color-red10'],
    '--tw-button-background': color['--t-color-red'],
    '--tw-button-border':
      backgroundTransparent['--t-background-transparent-light'],
    '--tw-button-color': 'color(display-p3 1 1 1)',
    '--tw-button-hover': color['--t-color-red8'],
  },
  dangerOutline: {
    '--tw-button-background': 'transparent',
    '--tw-button-border': borderColor['--t-border-color-danger'],
  },
  dangerSoft: {
    '--tw-button-background': background['--t-background-danger'],
    '--tw-button-hover': color['--t-color-red3'],
  },
  success: {
    '--tw-button-active': color['--t-color-green4'],
    '--tw-button-color': color['--t-color-green9'],
    '--tw-button-hover': color['--t-color-green3'],
  },
  successSolid: {
    '--tw-button-active': color['--t-color-green12'],
    '--tw-button-background': color['--t-color-green9'],
    '--tw-button-border':
      backgroundTransparent['--t-background-transparent-light'],
    '--tw-button-color': 'color(display-p3 1 1 1)',
    '--tw-button-hover': color['--t-color-green10'],
  },
  successOutline: {
    '--tw-button-background': 'transparent',
    '--tw-button-border': color['--t-color-green9'],
  },
  successSoft: {
    '--tw-button-background': color['--t-color-green3'],
    '--tw-button-hover': color['--t-color-green4'],
  },
  content: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'inherit',
    maxInlineSize: '100%',
    minInlineSize: 0,
  },
  label: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  icon: { alignItems: 'center', display: 'inline-flex', flexShrink: 0 },
  hidden: { opacity: 0 },
  loader: {
    alignItems: 'center',
    display: 'flex',
    inlineSize: spacing['--t-spacing-6'],
    inset: 0,
    margin: 'auto',
    position: 'absolute',
  },
});

const variantStyles = {
  outline: null,
  solid: styles.solid,
  ghost: styles.ghost,
  soft: styles.soft,
  link: null,
};

const colorStyles = {
  neutral: null,
  accent: styles.accent,
  danger: styles.danger,
  success: styles.success,
};

const solidColorStyles = {
  neutral: null,
  accent: styles.accentSolid,
  danger: styles.dangerSolid,
  success: styles.successSolid,
};

const outlineColorStyles = {
  neutral: null,
  accent: styles.accentOutline,
  danger: styles.dangerOutline,
  success: styles.successOutline,
};

const softColorStyles = {
  neutral: null,
  accent: styles.accentSoft,
  danger: styles.dangerSoft,
  success: styles.successSoft,
};
