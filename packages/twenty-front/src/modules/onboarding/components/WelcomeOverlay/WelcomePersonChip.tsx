import * as stylex from '@stylexjs/stylex';
import { Avatar, type AvatarSize } from 'twenty-ui/primitives/data-display';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

type WelcomePersonChipSizeVariant = 'default' | 'compact';

const NARROW_VIEWPORT = '@media (max-width: 600px)';

const styles = stylex.create({
  chip: {
    alignItems: 'center',
    display: 'inline-flex',
  },
  chipDefault: {
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
  },
  chipCompact: {
    gap: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-0_5'],
  },
  personName: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-primary'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: {
      [NARROW_VIEWPORT]: 'min(calc(70vw / var(--t-zoom, 1)), 360px)',
      default: 'min(calc(40vw / var(--t-zoom, 1)), 360px)',
    },
    minWidth: '0',
  },
});

type WelcomePersonChipProps = {
  avatarSize?: AvatarSize;
  sizeVariant?: WelcomePersonChipSizeVariant;
};

export const WelcomePersonChip = ({
  avatarSize = 'lg',
  sizeVariant = 'default',
}: WelcomePersonChipProps) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const firstName = currentWorkspaceMember?.name?.firstName ?? '';
  const lastName = currentWorkspaceMember?.name?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div
      {...stylex.props(
        styles.chip,
        sizeVariant === 'compact' ? styles.chipCompact : styles.chipDefault,
      )}
    >
      <Avatar
        shape="circle"
        size={avatarSize}
        name={fullName}
        colorSeed={currentWorkspaceMember?.id}
        src={getAbsoluteImageUrl(currentWorkspaceMember?.avatarUrl)}
      />
      <span {...stylex.props(styles.personName)}>{fullName}</span>
    </div>
  );
};
