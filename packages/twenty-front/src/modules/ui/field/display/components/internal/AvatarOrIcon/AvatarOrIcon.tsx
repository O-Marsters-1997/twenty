import { getAvatarButtonRender } from '@/ui/field/display/utils/getAvatarButtonRender';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';

import { Avatar } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';
import {
  background,
  borderRadius,
  color,
} from 'twenty-ui/theme/tokens.stylex';
import { type AvatarOrIconProps } from './types/AvatarOrIconProps';
import { isDefined } from 'twenty-shared/utils';

const styles = stylex.create({
  iconWithBackgroundContainer: {
    alignItems: 'center',
    backgroundColor: background['--t-background-inverted-secondary'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    height: '14px',
    justifyContent: 'center',
    width: '14px',
  },
  iconBackground: (backgroundColor: string) => ({
    backgroundColor,
  }),
  wrapper: {
    cursor: 'inherit',
    display: 'flex',
    outlineColor: color['--t-color-blue'],
    outlineOffset: { default: null, ':focus-visible': '1px' },
    outlineStyle: { default: null, ':focus-visible': 'solid' },
    outlineWidth: { default: null, ':focus-visible': '2px' },
  },
  wrapperClickable: {
    backgroundColor: 'transparent',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderWidth: '0',
    color: 'inherit',
    cursor: 'pointer',
    font: 'inherit',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
  },
});

export const AvatarOrIcon = ({
  Icon,
  colorSeed,
  shape,
  src,
  name,
  isIconInverted = false,
  IconColor,
  IconBackgroundColor,
  onClick,
}: AvatarOrIconProps) => {
  const theme = useTheme();

  if (!isDefined(Icon)) {
    return (
      <Avatar
        src={src}
        colorSeed={colorSeed}
        name={name}
        size="sm"
        shape={shape ?? undefined}
        render={getAvatarButtonRender({ name, onClick })}
      />
    );
  }

  const accessibleLabel = isNonEmptyString(name) ? name : t`Avatar`;

  const iconContent =
    isIconInverted || isDefined(IconBackgroundColor) ? (
      <span
        {...stylex.props(
          styles.iconWithBackgroundContainer,
          isDefined(IconBackgroundColor) &&
            styles.iconBackground(IconBackgroundColor),
        )}
      >
        <Icon
          color={theme.font.color.inverted}
          size={theme.icon.size.sm}
          stroke={theme.icon.stroke.sm}
          aria-hidden
        />
      </span>
    ) : (
      <Icon
        size={theme.icon.size.sm}
        stroke={theme.icon.stroke.sm}
        color={IconColor || 'currentColor'}
        aria-hidden
      />
    );

  if (isDefined(onClick)) {
    return (
      <button
        type="button"
        {...stylex.props(styles.wrapper, styles.wrapperClickable)}
        aria-label={accessibleLabel}
        onClick={onClick}
      >
        {iconContent}
      </button>
    );
  }

  return <div {...stylex.props(styles.wrapper)}>{iconContent}</div>;
};
