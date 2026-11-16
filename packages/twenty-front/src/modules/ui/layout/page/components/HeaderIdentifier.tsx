import { getAvatarButtonRender } from '@/ui/field/display/utils/getAvatarButtonRender';
import { StyledHeaderIdentifierLabel } from '@/ui/layout/page/components/StyledHeaderIdentifierLabel';
import { type MouseEventHandler, type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { Avatar, type AvatarProps } from 'twenty-ui/primitives/data-display';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const HEADER_IDENTIFIER_TILE_SIZE = '24px';

const styles = stylex.create({
  icon: {
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    height: HEADER_IDENTIFIER_TILE_SIZE,
    justifyContent: 'center',
    width: HEADER_IDENTIFIER_TILE_SIZE,
  },
  iconColor: (color: string) => ({ color }),
  title: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    margin: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
  titleMd: { fontSize: fontSize['--t-font-size-md'] },
  titleLg: { fontSize: fontSize['--t-font-size-lg'] },
  container: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
  },
  textContainer: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-2'],
    minWidth: '0',
  },
});

type HeaderIdentifierProps = {
  avatar?: Pick<
    AvatarProps,
    'src' | 'name' | 'colorSeed' | 'shape' | 'variant'
  > & {
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };
  icon?: ReactNode;
  iconColor?: string;
  fontSize?: 'md' | 'lg';
  title: ReactNode;
  label?: ReactNode;
};

export const HeaderIdentifier = ({
  avatar,
  icon,
  iconColor,
  fontSize = 'md',
  title,
  label,
}: HeaderIdentifierProps) => {
  const identifierIcon = isDefined(avatar) ? (
    <Avatar
      src={avatar.src}
      render={getAvatarButtonRender(avatar)}
      name={avatar.name}
      colorSeed={avatar.colorSeed}
      shape={avatar.shape}
      variant={avatar.variant}
      size={fontSize}
    />
  ) : (
    icon
  );

  const shouldRenderInTile = !isDefined(avatar) || fontSize === 'md';

  return (
    <div {...stylex.props(styles.container)}>
      {isDefined(identifierIcon) &&
        (shouldRenderInTile ? (
          <div
            {...stylex.props(
              styles.icon,
              isDefined(iconColor) && styles.iconColor(iconColor),
            )}
          >
            {identifierIcon}
          </div>
        ) : (
          identifierIcon
        ))}
      <div {...stylex.props(styles.textContainer)}>
        <h3
          {...stylex.props(
            styles.title,
            fontSize === 'lg' ? styles.titleLg : styles.titleMd,
          )}
        >
          {typeof title === 'string' ? (
            <OverflowingTextWithTooltip text={title} />
          ) : (
            title
          )}
        </h3>
        {isDefined(label) && (
          <StyledHeaderIdentifierLabel>{label}</StyledHeaderIdentifierLabel>
        )}
      </div>
    </div>
  );
};
