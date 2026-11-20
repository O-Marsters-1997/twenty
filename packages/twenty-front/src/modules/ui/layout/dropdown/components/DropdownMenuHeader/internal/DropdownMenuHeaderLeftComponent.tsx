import { t } from '@lingui/core/macro';
import { type MouseEvent, type ReactElement } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { type IconComponent } from 'twenty-ui/icon';
import {
  type Avatar,
  type AvatarProps,
} from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { font, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  nonClickableStartIcon: {
    background: 'transparent',
    borderStyle: 'none',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    fontFamily: font['--t-font-family'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    height: spacing['--t-spacing-6'],
    width: spacing['--t-spacing-6'],
  },
  avatarWrapper: {
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
  },
});

export const DropdownMenuHeaderLeftComponent = ({
  onClick,
  ...props
}: { onClick?: (event: MouseEvent<HTMLButtonElement>) => void } & (
  | { Icon: IconComponent }
  | {
      Avatar: ReactElement<AvatarProps, typeof Avatar>;
    }
  | Record<never, never>
)) => {
  const theme = useTheme();
  return (
    <>
      {'Icon' in props &&
        (onClick ? (
          <LightIconButton
            emphasis="subtle"
            size="sm"
            onClick={onClick}
            aria-label={t`Go back`}
          >
            <props.Icon />
          </LightIconButton>
        ) : (
          <div {...stylex.props(styles.nonClickableStartIcon)}>
            <props.Icon
              size={theme.icon.size.sm}
              color={theme.font.color.tertiary}
            />
          </div>
        ))}

      {'Avatar' in props && (
        <div {...stylex.props(styles.avatarWrapper)}>{props.Avatar}</div>
      )}
    </>
  );
};
