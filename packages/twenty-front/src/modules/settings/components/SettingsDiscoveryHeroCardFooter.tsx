import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
  textLineHeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  content: {
    gap: spacing['--t-spacing-3'],
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
  iconContainer: {
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '2px',
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    height: spacing['--t-spacing-8'],
    minWidth: spacing['--t-spacing-8'],
    width: spacing['--t-spacing-8'],
  },
  icon: {
    alignItems: 'center',
    display: 'inline-flex',
    justifyContent: 'center',
    transform: 'rotate(-4deg)',
  },
  textContainer: {
    flex: '1',
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: '0',
  },
  title: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    minHeight: spacing['--t-spacing-4'],
    width: '100%',
  },
  description: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: textLineHeight['--t-text-line-height-lg'],
  },
  actionContainer: {
    flexShrink: '0',
    marginLeft: 'auto',
  },
});

type SettingsDiscoveryHeroCardFooterProps = {
  Icon: IconComponent;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
};

export const SettingsDiscoveryHeroCardFooter = ({
  Icon,
  title,
  description,
  action,
}: SettingsDiscoveryHeroCardFooterProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.content)}>
      <div {...stylex.props(styles.iconContainer)}>
        <div {...stylex.props(styles.icon)}>
          <Icon
            size={theme.icon.size.lg}
            color={theme.IllustrationIcon.color.gray}
            stroke={theme.icon.stroke.md}
          />
        </div>
      </div>
      <div {...stylex.props(styles.textContainer)}>
        <div {...stylex.props(styles.title)}>{title}</div>
        {description && (
          <div {...stylex.props(styles.description)}>
            <OverflowingTextWithTooltip text={description} />
          </div>
        )}
      </div>
      {isDefined(action) && (
        <div {...stylex.props(styles.actionContainer)}>{action}</div>
      )}
    </div>
  );
};
