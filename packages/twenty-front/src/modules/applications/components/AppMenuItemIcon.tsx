import { AppChip } from '@/applications/components/AppChip';
import { ApplicationStackIcon } from '@/applications/components/ApplicationStackIcon';
import { isDefined } from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  appIconContainer: {
    background: backgroundTransparent['--t-background-transparent-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
});

type AppMenuItemIconProps = {
  applicationId?: string | null;
  Icon?: IconComponent;
};

export const AppMenuItemIcon = ({
  applicationId,
  Icon,
}: AppMenuItemIconProps) => (
  <span {...stylex.props(styles.appIconContainer)}>
    {isDefined(Icon) ? (
      <ApplicationStackIcon Icon={Icon} applicationId={applicationId} />
    ) : (
      <AppChip applicationId={applicationId} size="md" chipOnly />
    )}
  </span>
);
