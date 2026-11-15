import * as stylex from '@stylexjs/stylex';

import { IconAlertTriangle, IconInfoCircle } from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { isDefined } from 'twenty-shared/utils';
import {
  accent,
  borderRadius,
  color,
  font,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { type SidePanelInformationBannerProps } from './types/SidePanelInformationBannerProps';

const styles = stylex.create({
  banner: {
    alignItems: 'center',
    backgroundColor: accent['--t-accent-secondary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    padding: spacing['--t-spacing-2'],
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    color: color['--t-color-blue'],
    display: 'flex',
    flexShrink: 0,
    height: '16px',
    justifyContent: 'center',
    width: '16px',
  },
  message: {
    color: color['--t-color-blue'],
    flexGrow: 1,
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-sm'],
    fontStyle: 'normal',
    fontWeight: fontWeight['--t-font-weight-medium'],
    lineHeight: 1.4,
    margin: 0,
    minWidth: 0,
  },
});

export const SidePanelInformationBanner = ({
  message,
  xstyle,
  variant = 'default',
  tooltipMessage,
}: SidePanelInformationBannerProps) => {
  return (
    <Tooltip
      content={tooltipMessage}
      disabled={!isDefined(tooltipMessage)}
      side="bottom"
      delay={500}
    >
      <div {...stylex.props(styles.banner, xstyle)}>
        <div {...stylex.props(styles.iconContainer)}>
          {variant === 'default' ? (
            <IconInfoCircle size={16} />
          ) : (
            <IconAlertTriangle size={16} />
          )}
        </div>
        <p {...stylex.props(styles.message)}>{message}</p>
      </div>
    </Tooltip>
  );
};
