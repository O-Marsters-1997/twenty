import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';
import { Avatar, type AvatarShape } from 'twenty-ui/primitives/data-display';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
    overflow: 'hidden',
  },
  avatarContainer: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
  },
});

type CoreObjectNameCellProps = {
  name: string | null | undefined;
  avatarColorSeed: string;
  avatarShape: AvatarShape;
  Icon?: IconComponent;
};

export const CoreObjectNameCell = ({
  name,
  avatarColorSeed,
  avatarShape,
  Icon,
}: CoreObjectNameCellProps) => {
  const { t } = useLingui();
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.container)}>
      <span {...stylex.props(styles.avatarContainer)}>
        {isDefined(Icon) ? (
          <span aria-hidden>
            <Icon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
          </span>
        ) : (
          <Avatar
            name={name ?? undefined}
            colorSeed={avatarColorSeed}
            size="sm"
            shape={avatarShape}
          />
        )}
      </span>
      <OverflowingTextWithTooltip
        text={isNonEmptyString(name) ? name : t`Untitled`}
      />
    </div>
  );
};
