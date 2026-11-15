import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderColor, borderRadius, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useLingui } from '@lingui/react/macro';
import { IconLock } from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import { MessageChannelVisibility } from '~/generated/graphql';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flex: '1 0 0',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-1'],
    height: '20px',
    marginLeft: 'auto',
    minWidth: spacing['--t-spacing-21'],
    paddingInline: spacing['--t-spacing-1'],
    width: '100%',
  },
  containerCompact: {
    flex: '0 0 auto',
    width: 'auto',
  },
});

type EmailThreadNotSharedProps = {
  visibility: MessageChannelVisibility;
};

export const EmailThreadNotShared = ({
  visibility,
}: EmailThreadNotSharedProps) => {
  const theme = useTheme();
  const { t } = useLingui();
  const containerId = 'email-thread-not-shared';
  const isCompact = visibility === MessageChannelVisibility.SUBJECT;

  return (
    <Tooltip
      content={t`Only the subject is shared`}
      delay={TooltipDelay.mediumDelay}
      side="bottom"
      positionMethod="fixed"
      disabled={!(visibility === MessageChannelVisibility.SUBJECT)}
    >
      <div
        id={containerId}
        {...stylex.props(styles.container, isCompact && styles.containerCompact)}
      >
        <IconLock size={theme.icon.size.sm} />
        {t`Not shared`}
      </div>
    </Tooltip>
  );
};
