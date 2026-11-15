import { useApplicationChipData } from '@/applications/hooks/useApplicationChipData';
import * as stylex from '@stylexjs/stylex';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { Avatar, type AvatarSize } from 'twenty-ui/primitives/data-display';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';

type AppChipProps = {
  size?: AvatarSize;
  applicationId?: string | null;
  // Resolved display url (e.g. the registration's logoUrl); takes precedence
  // over the logo computed from the installed application.
  logoUrl?: string | null;
  fallbackApplicationData?: {
    logoUrl?: string | null;
    name?: string | null;
  };
  xstyle?: stylex.StyleXStyles;
  chipOnly?: boolean;
  rounded?: boolean;
  pulsing?: boolean;
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'inline-flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
});

export const AppChip = ({
  applicationId,
  size = 'sm',
  logoUrl,
  fallbackApplicationData,
  xstyle,
  chipOnly = false,
  rounded = false,
  pulsing = false,
}: AppChipProps) => {
  const { applicationChipData } = useApplicationChipData({
    applicationId,
    fallbackApplicationData,
  });

  return (
    <div {...stylex.props(styles.container, xstyle)}>
      <Avatar
        shape={rounded ? 'circle' : 'square'}
        variant={rounded ? 'soft' : 'outline'}
        size={size}
        src={getAbsoluteImageUrl(logoUrl ?? applicationChipData.logo)}
        name={applicationChipData.name}
        colorSeed={applicationChipData.seed}
        color={applicationChipData.colors?.color}
        backgroundColor={applicationChipData.colors?.backgroundColor}
        borderColor={applicationChipData.colors?.borderColor}
        pulsing={pulsing}
      />
      {!chipOnly && (
        <OverflowingTextWithTooltip text={applicationChipData.name} />
      )}
    </div>
  );
};
