import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, spacing, border, font, text } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  content: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: border['--t-border-color-light'],
    borderTopLeftRadius: border['--t-border-radius-sm'],
    borderTopRightRadius: border['--t-border-radius-sm'],
    borderBottomRightRadius: border['--t-border-radius-sm'],
    borderBottomLeftRadius: border['--t-border-radius-sm'],
    display: 'flex',
    height: spacing['--t-spacing-8'],
    justifyContent: 'center',
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
    alignItems: 'flex-start',
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
    minWidth: '0',
  },
  title: {
    alignItems: 'center',
    color: font['--t-font-color-primary'],
    display: 'flex',
    fontWeight: font['--t-font-weight-medium'],
    minHeight: spacing['--t-spacing-4'],
    width: '100%',
  },
  description: {
    color: font['--t-font-color-secondary'],
    fontSize: font['--t-font-size-sm'],
    lineHeight: text['--t-text-line-height-lg'],
    overflow: 'hidden',
    textBoxEdge: 'cap alphabetic',
    textBoxTrim: 'trim-both',
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
