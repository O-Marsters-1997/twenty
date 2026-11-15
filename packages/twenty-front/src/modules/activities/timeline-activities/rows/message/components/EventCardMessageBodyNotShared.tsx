import { Trans } from '@lingui/react/macro';
import { IconLock } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderColor, fontColor, fontSize, fontWeight, iconSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  emailBodyNotSharedContainer: {
    alignItems: 'center',
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: spacing['--t-spacing-1'],
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    flexDirection: 'column',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-3'],
    height: '80px',
    justifyContent: 'center',
    width: '100%',
  },
  emailBodyNotSharedIconContainer: {
    alignItems: 'center',
    display: 'flex',
    height: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    justifyContent: 'center',
    width: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  emailBodyNotShared: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
});

export const EventCardMessageBodyNotShared = ({
  notSharedByFullName,
}: {
  notSharedByFullName: string;
}) => (
  <div {...stylex.props(styles.emailBodyNotSharedContainer)}>
    <div {...stylex.props(styles.emailBodyNotShared)}>
      <div {...stylex.props(styles.emailBodyNotSharedIconContainer)}>
        <IconLock />
      </div>
      <span>
        <Trans>Not shared by {notSharedByFullName}</Trans>
      </span>
    </div>
  </div>
);
