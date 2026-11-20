import { OnboardingSkipDialogAvatarItem } from '@/onboarding/components/OnboardingSkipDialogAvatarItem';
import * as stylex from '@stylexjs/stylex';
import { AvatarGroup } from 'twenty-ui/components/data-display';
import { IconPlus } from 'twenty-ui/icon';
import {
  AVATAR_PROPERTIES_BY_SIZE,
  Avatar,
  type AvatarShape,
} from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';
import {
  background,
  borderColor,
  fontColor,
} from 'twenty-ui/theme/tokens.stylex';

const MAX_VISIBLE_AVATARS = 5;

const EMPTY_SEAT_SIZE = AVATAR_PROPERTIES_BY_SIZE.lg.width;

const styles = stylex.create({
  emptySeat: {
    borderColor: borderColor['--t-border-color-strong'],
    borderRadius: '50%',
    borderStyle: 'dashed',
    borderWidth: '1px',
    cornerShape: 'round',
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    boxShadow: `0 0 0 2px ${background['--t-background-primary']}`,
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    justifyContent: 'center',
  },
  emptySeatSize: (size: string) => ({
    height: size,
    width: size,
  }),
});

type OnboardingSkipDialogAvatar = {
  id: string;
  name: string;
  src?: string | null;
  shape: AvatarShape;
};

type OnboardingSkipDialogAvatarsProps = {
  avatars: OnboardingSkipDialogAvatar[];
  emptySeatsCount?: number;
};

export const OnboardingSkipDialogAvatars = ({
  avatars,
  emptySeatsCount = 0,
}: OnboardingSkipDialogAvatarsProps) => {
  const theme = useTheme();

  const visibleAvatars = avatars.slice(0, MAX_VISIBLE_AVATARS);

  return (
    <AvatarGroup
      maxVisible={visibleAvatars.length + emptySeatsCount}
      overlapOffset="4px"
      avatars={[
        ...visibleAvatars.map((avatar, index) => (
          <OnboardingSkipDialogAvatarItem key={avatar.id} index={index}>
            <Avatar
              src={avatar.src}
              name={avatar.name}
              colorSeed={avatar.id}
              size="lg"
              shape={avatar.shape}
              ring
            />
          </OnboardingSkipDialogAvatarItem>
        )),
        ...Array.from({ length: emptySeatsCount }, (_, emptySeatIndex) => (
          <OnboardingSkipDialogAvatarItem
            key={`empty-seat-${emptySeatIndex}`}
            index={visibleAvatars.length + emptySeatIndex}
          >
            <div
              {...stylex.props(
                styles.emptySeat,
                styles.emptySeatSize(EMPTY_SEAT_SIZE),
              )}
            >
              <IconPlus size={theme.icon.size.sm} />
            </div>
          </OnboardingSkipDialogAvatarItem>
        )),
      ]}
    />
  );
};
