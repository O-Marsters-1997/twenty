import { Trans } from '@lingui/react/macro';
import { IconLock } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  iconSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  emailBodyNotSharedContainer: {
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: spacing['--t-spacing-1'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-3'],
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    flexDirection: 'column',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'center',
    height: '80px',
    width: '100%',
  },
  emailBodyNotSharedIconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
    width: `calc(${iconSize['--t-icon-size-sm']} * 1px)`,
  },
  emailBodyNotShared: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
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
